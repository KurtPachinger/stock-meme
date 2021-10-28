sm = {
  var: {
    unit: 64,
    tools: document.getElementById("tools"),
    stage: document.getElementById("stage")
  },
  init: function () {
    // grid
    let unitPx = sm.var.unit / 2 + "px ";
    sm.var.stage.style.backgroundSize = unitPx + unitPx;
    // enable clone
    sm.interact.dropzone("#stage");
    // enable drag
    sm.interact.drag(sm.var.tools);
    let ico = sm.var.tools.querySelectorAll(".ico");
    for (let i = 0; i < ico.length; i++) {
      sm.interact.drag(ico[i]);
    }
    // event listeners
    let labels = sm.var.tools.querySelectorAll("label");
    for (let i = 0; i < labels.length; i++) {
      labels[i].addEventListener("pointerup", sm.tools.label);
    }

    sm.stage.click();
    sm.stage.type();
    sm.tools.color();
    sm.tools.file();
  },
  interact: {
    drag: function (el) {
      interact(el)
        .draggable({
          ignoreFrom: "label, canvas, svg",
          modifiers: [
            interact.modifiers.snap({
              targets: [
                interact.snappers.grid({
                  x: sm.var.unit / 2,
                  y: sm.var.unit / 2
                })
              ],
              relativePoints: [
                { x: 0, y: 0 }, // top-left
                { x: 1, y: 1 } // bottom-right
              ]
            }),
            interact.modifiers.restrictRect({
              restriction: document.body,
              endOnly: true
            })
          ]
        })
        .on("dragmove", function (e) {
          // get previous
          let x = parseFloat(e.target.getAttribute("data-x")) || 0;
          let y = parseFloat(e.target.getAttribute("data-y")) || 0;
          x += e.dx;
          y += e.dy;
          // set position
          e.target.style.transform = "translate(" + x + "px, " + y + "px)";
          e.target.setAttribute("data-x", x);
          e.target.setAttribute("data-y", y);
        })
        .on("dragend", function (e) {
          if (e.target.id != "tools") {
            // io.dragmove
            sm.mcast.add(e.target.id, e.type, {
              x: e.target.getAttribute("data-x"),
              y: e.target.getAttribute("data-y")
            });
          }
        });
    },
    resize: function (el) {
      interact(el)
        .resizable({
          ignoreFrom: "label, textarea, canvas, svg",
          edges: { left: false, right: true, bottom: true, top: false },
          preserveAspectRatio: true,
          //invert: 'preserve',
          modifiers: [
            interact.modifiers.snapSize({
              targets: [
                interact.snappers.grid({
                  x: sm.var.unit / 2,
                  y: sm.var.unit / 2,
                  range: Infinity
                })
              ]
            }),
            interact.modifiers.restrictSize({
              min: { width: sm.var.unit, height: sm.var.unit },
              max: { width: sm.var.unit * 8, height: sm.var.unit * 8 }
            })
          ]
        })
        .on("resizemove", function (event) {
          let target = event.target;
          target.style.width = event.rect.width + "px";
          target.style.height = event.rect.height + "px";
          //font awesome scale
          let min = Math.min(event.rect.width, event.rect.height);
          //target.style.fontSize = min + "px";
          target.setAttribute(
            "data-scale",
            Math.round((min / sm.var.unit) * 2) / 2
          );
        })
        .on("resizeend", function (event) {
          let target = event.target;
          // io.resize
          sm.mcast.add(target.id, event.type, {
            width: target.style.width,
            height: target.style.height,
            scale: target.getAttribute("data-scale")
          });
        });
    },
    dropzone: function (el) {
      interact(el)
        .dropzone({
          accept: ".ico"
        })
        .on("drop", function (event) {
          let original = event.relatedTarget;

          // wrap attr
          let wrap = document.createElement("div");
          wrap.classList.add("sel");
          let rect = original.getClientRects()[0];
          wrap.setAttribute("data-x", rect.x);
          wrap.setAttribute("data-y", rect.y);
          wrap.style =
            "transform:translate(" + rect.x + "px," + rect.y + "px);";
          wrap.style.width = wrap.style.height = sm.var.unit + "px";

          // original attr reset
          original.style.cursor = original.style.transform = "";
          original.removeAttribute("data-x");
          original.removeAttribute("data-y");

          // clone attr
          let clone = original.cloneNode(true);
          clone.classList.remove("ico", "drop-target");
          clone.classList.add("animated", "infinite");
          clone.removeAttribute("data-x");
          clone.removeAttribute("data-y");
          let color = document.getElementById("fa-eye-dropper").value;
          //clone.style.cursor = clone.style.transform = "";
          clone.style.color = color;
          clone.style.fill = color;

          // event listeners
          sm.interact.drag(wrap);
          sm.interact.resize(wrap);

          // drop clone
          wrap.id = sm.mcast.log.uid + "_" + sm.mcast.log.id++;
          wrap.appendChild(clone);
          sm.var.stage.appendChild(wrap);

          // io.clone ...todo: remove .edit
          let en = sm.mcast.LZW.en(wrap.outerHTML);
          console.log("LZW", wrap.outerHTML.length, en.length);
          sm.mcast.add(wrap.id, event.type, {
            value: en
          });
        })
        .on("dropactivate dropdeactivate", function (event) {
          var ico = event.relatedTarget;
          ico.classList.toggle("drop-target");
          event.target.classList.toggle("drop-active");
        });
    }
  },

  stage: {
    click: function () {
      sm.var.stage.addEventListener("pointerdown", function (e) {
        let name = e.target.nodeName.toLowerCase();
        if (name == "canvas" || name == "svg" || name == "path") {
          sm.stage.draw(e);
        }

        // set edit state
        let edits = document.querySelectorAll(".edit");
        for (let i = 0; i < edits.length; i++) {
          edits[i].classList.remove("edit");
        }

        let edit = e.target;
        if (edit != sm.var.stage) {
          if (!edit.classList.contains("sel")) {
            edit = edit.closest(".sel");
          }
        }
        edit.classList.add("edit");
      });
    },
    type: function () {
      document.addEventListener("keyup", function (e) {
        let el = sm.var.stage.querySelector(".sel.edit");
        let name = e.target.nodeName.toLowerCase();
        if (e.key == "Escape") {
          console.log("Shortcuts:", "Arrow Keys:", "+/-", "");
        }

        if (name == "textarea") {
          // io.textarea
          sm.mcast.add(el.id, name, {
            value: e.target.value
          });
        } else if (name == "body") {
          // body
          let title, val;
          if (el) {
            if (e.key == "Delete") {
              title = "fa-trash-alt";
            } else if (e.key == "Backspace") {
              title = "fa-eraser";
              let target = el.querySelector("canvas, svg");
              target && (target = target.nodeName.toLowerCase());
              val = { value: target };
            } else if (e.key == "[" || e.key == "]") {
              title = "fa-level";
              title += e.key == "[" ? "-down-alt" : "-up-alt";
              val = { value: e.key };
              // directional...?
            } else if (
              e.key == "ArrowLeft" ||
              e.key == "ArrowRight" ||
              e.key == "ArrowUp" ||
              e.key == "ArrowDown"
            ) {
              title = "dragend";
              let x = Number(el.getAttribute("data-x"));
              let y = Number(el.getAttribute("data-y"));
              let dir = e.key == "ArrowDown" || e.key == "ArrowRight" ? 1 : -1;
              dir *= sm.var.unit;
              if (e.key == "ArrowLeft" || e.key == "ArrowRight") {
                x += dir;
              } else {
                y += dir;
              }
              val = {
                x: x,
                y: y
              };
            } else if (e.key == "+" || e.key == "-") {
              title = "resizeend";
              let zoom = e.key == "+" ? 1 : -1;
              zoom *= sm.var.unit;
              let width = el.offsetWidth + zoom;
              let height = el.offsetHeight + zoom;

              let min = Math.min(
                width - (width % sm.var.unit),
                height - (height % sm.var.unit)
              );
              //let scale = Math.round(min)/sm.var.unit;
              val = {
                width: width + "px",
                height: height + "px",
                scale: Math.round((min / sm.var.unit) * 2) / 2
              };
              //console.log(val);
            }

            if (title) {
              sm.tools.set(el, title, val);
              sm.mcast.add(el.id, title, val);
            }
          }
        }
      });
    },
    draw: function (e) {
      if (e instanceof HTMLElement) {
        // pointerup, pointerleave, DOMNodeRemoved
        e.removeEventListener("pointermove", sm.stage.draw);
        e.onpointerup = e.onpointerleave = null;
        return;
      }

      let el = e.target;
      let x = e.offsetX;
      let y = e.offsetY;

      let name = el.nodeName.toLowerCase();
      if (el != sm.var.stage && name != "div") {
        // set tool/color
        let col = document.getElementById("fa-eraser").checked
          ? "transparent"
          : document.getElementById("fa-eye-dropper").value;

        let edit = el.closest(".sel").classList.contains("edit");
        if (name == "canvas") {
          sm.stage.canvas(el, x, y, col);
          // event handlers, should include elements removed?
          el.addEventListener("pointermove", sm.stage.draw);
          el.onpointerup = el.onpointerleave = function () {
            sm.stage.draw(el);
          };
        } else if (name == "svg" || name == "path") {
          sm.stage.svg(el.closest("svg"), x, y, col, edit);
        }

        // io.canvas/svg
        sm.mcast.add(el.closest(".sel").id, name, {
          x: x,
          y: y,
          col: col,
          edit: edit
        });
      }
    },
    canvas: function (el, x, y, col) {
      if (typeof el == "string") {
        el = sm.var.stage.querySelector("#" + el + " canvas");
        if (!el) {
          return;
        }
      }

      let ctx = el.getContext("2d");
      // size native
      let bound = el.getBoundingClientRect();
      let w = bound.width / el.width;
      let h = bound.height / el.height;
      // draw responsive
      let pixelSize = sm.var.unit / 4;
      let tool = col == "transparent" ? "clearRect" : "fillRect";
      ctx.fillStyle = col;

      ctx[tool](
        x / w - pixelSize / w / 2,
        y / h - pixelSize / h / 2,
        pixelSize / w,
        pixelSize / h
      );
    },
    svg: function (el, x, y, col, edit) {
      // vanilla JS
      //stackoverflow.com/questions/42954295/
      // GreenSock
      //codepen.io/GreenSock/pen/wvgGxEr
      //codepen.io/GreenSock/pen/8fcb337385d0f1e401a66f260cf73e76
      // interact.js
      //codepen.io/lao-tseu-is-alive/pen/ZamYRY
      //codepen.io/taye/pen/xEJeo
      if (typeof el == "string") {
        el = document.querySelector("#" + el + " svg");
        if (!el) {
          return;
        }
      }

      // size native
      let svg = el.closest("svg");
      let bound = svg.getBoundingClientRect();
      let w = bound.width / svg.viewBox.baseVal.width;
      let h = bound.height / svg.viewBox.baseVal.height;
      // add point responsive
      var point = svg.createSVGPoint();
      point.x = x / w;
      point.y = y / h;

      // path or new
      let path = svg.querySelector("path:last-child");
      //editing = editing ? editing : svg.closest(".sel").classList.contains("edit");
      if (!path || !edit) {
        // if no path or regain focus & not click old path
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", " ");
        path.style.fill = col;
        svg.appendChild(path);
      }

      let d = path.getAttribute("d");
      d = d.replace("M", "").replace("Z", "");
      path.setAttribute("d", "M" + d + " " + point.x + "," + point.y + "Z");
    }
  },
  tools: {
    set: function (el, event, val) {
      let media = el.firstElementChild;
      const fa = /(fa)(-[a-z]+)+/g;
      let title = media && media.className.match(fa)[0];
      let val_uid = document.getElementById(event);

      switch (event) {
        // remote/local event val ? provided : retrieved
        case "drop":
          break;
        case "resizeend":
          el.style.width = val.width;
          el.style.height = val.height;
          el.setAttribute("data-scale", val.scale);
          break;
        case "dragend":
          el.setAttribute("data-x", val.x);
          el.setAttribute("data-y", val.y);
          el.style.transform = "translate(" + val.x + "px, " + val.y + "px)";
          break;
        case "fa-trash-alt":
          let canvas = el.querySelector("canvas");
          if (canvas) {
            sm.stage.draw(canvas);
          }
          interact(el).unset();
          el.parentNode.removeChild(el);
          el = null;
          break;
        case "fa-level-down-alt":
        case "fa-level-up-alt":
          let sort = event == "fa-level-down-alt" ? "[" : "]";
          val = val ? val.value : sort;
          if (el.previousElementSibling && val == "[") {
            el.parentNode.insertBefore(el, el.previousElementSibling);
          } else if (el.nextElementSibling && val == "]") {
            el.parentNode.insertBefore(el.nextElementSibling, el);
          }
          break;
        case "fa-eraser":
          if (title == "fa-draw-polygon") {
            let path = media.querySelector("svg path:last-child");
            if (path) {
              let points = path.getAttribute("d");
              points = points.slice(0, points.lastIndexOf(" ")) + "Z";
              points = points.indexOf(",") > -1 ? points : false;
              if (!points) {
                path.parentNode.removeChild(path);
              } else {
                path.setAttribute("d", points);
              }
              val = val ? val.value : "path";
            }
          }
          break;
        case "fa-eye-dropper":
          val = val ? val.value : val_uid.value;
          media.style.color = val;
          if (title == "fa-draw-polygon") {
            media = media.querySelector("svg path:last-child");
            media && (media.style.fill = val);
          }
          break;
        case "fa-play-circle":
          // animate.css 3.7.0+ honors "prefers-reduced-motion"

          val = val ? val.value : val_uid.selectedOptions[0].value;
          for (let i = 0; i < val_uid.length; i++) {
            media.classList.remove(val_uid.options[i].value);
          }
          media.classList.add(val);
          break;
        case "fa-asterisk":
          val = val ? val.value : val_uid.value;
          console.log("val", val);
          let metaOld = el.getAttribute("data-meta");
          // no change?
          if (metaOld != val) {
            // elements pre/post
            el.setAttribute("data-meta", val);

            // media type
            media = media.firstElementChild || media;
            if (title == "fa-link") {
              media.setAttribute("src", val);
            } else if (title == "fa-external-link-alt") {
              media.setAttribute("href", val);
            } else {
              // effects: .onionskin, transform...
              const tf = /\w+[(](.+)[)]/;
              let transform = "translate(0)";

              sequence(val);
              sequence(metaOld);

              function sequence(meta) {
                meta = meta || "";
                let group = sm.var.stage.querySelectorAll(
                  "[data-meta='" + meta + "']"
                );
                let fx = meta.split(" ");

                for (let i = 0; i < group.length; i++) {
                  let el = group[i];
                  for (let j = 0; j < fx.length; j++) {
                    // onionskin, transform, or both
                    let effect = fx[j];
                    let onion = effect.charAt(0) == ".";
                    let trans = effect.match(tf);
                    trans && (trans = trans[0]);
                    // 1s render loop
                    let dur = 0;
                    if(onion){
                      dur =  1 / group.length 
                    }else if(trans){
                      dur=1
                    };

                    // UNSET
                    // effects
                    // just set to initial?
                    el.style.removeProperty("animation-delay");
                    el.style.removeProperty("animation-duration");
                    el.style.removeProperty("animation-timing-function");
                    // onion
                    el.classList.remove("onion");
                    // transform
                    el.style.setProperty("--t4", trans || transform);
                    el.style.setProperty("--t5", dur + "s");

                    // SET

                    setTimeout(() => {
                      if (onion) {
                        // onion
                        el.classList.add("onion");
                        el.style.setProperty(
                          "animation-timing-function",
                          "steps(" + group.length + ")"
                        );
                        el.style.setProperty("animation-delay", i * dur + "s");
                        el.style.setProperty(
                          "animation-duration",
                          dur * group.length + "s"
                        );
                      }
                    }, 2000);
                  }
                }
              }
            }
          }
          break;
        default:
          // class toggles...
          val = val
            ? val.value
            : !el.classList.contains(event.replace("fa-", ""));
          el.classList.toggle(event.replace("fa-", ""), val);
      }

      return val;
    },
    label: function (e) {
      e.stopPropagation();
      if (e.target.nodeName.toLowerCase() != "label") {
        return;
      }
      // UI CLICK HANDLERS
      let label = e.target;
      let title = label.classList;

      if (title.contains("dir")) {
        // pagination
        let parent = e.target.parentElement;
        let pageCurr = parent.querySelector(".page.current");
        let pageNext;
        if (pageCurr && pageCurr.nextElementSibling !== null) {
          pageNext = pageCurr.nextElementSibling;
        } else {
          pageNext = parent.querySelector(".page");
        }
        pageCurr && pageCurr.classList.remove("current");
        pageNext && pageNext.classList.add("current");
      } else {
        const fa = /(fa)(-[a-z]+)+/g;
        title = title.value.match(fa)[0];

        // tool state
        let checkbox = label.querySelector("input[type=checkbox]");
        if (checkbox) {
          label.classList.toggle("active");
        }

        if (title == "fa-expand" || title == "fa-adjust") {
          // ui theme
          document.body.classList.toggle(title.slice(3));
        } else if (title == "fa-film") {
          if (typeof domtoimage != "undefined") {
            sm.tools.render(document.getElementById(title));
          } else {
            let js_dti = document.createElement("script");
            js_dti.src =
              "//cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js";
            js_dti.onload = function () {
              let js_gs = document.createElement("script");
              js_gs.src =
                "//cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js";
              js_gs.onload = function () {
                sm.tools.render(document.getElementById(title));
              };
              document.head.appendChild(js_gs);
            };
            document.head.appendChild(js_dti);
          }
        } else if (title == "fa-running") {
          //if (label.classList.contains("active")) {
          console.log("HTTPRelay mcast");
          if (sm.mcast.xhr == null) {
            // inject jquery?
            let js_j = document.createElement("script");
            js_j.src = "//code.jquery.com/jquery-3.6.0.min.js";
            js_j.onload = function () {
              $.ajaxSetup({
                xhrFields: {
                  //SeqId (OOO) passed via cookies
                  withCredentials: true
                }
              });
              sm.mcast.receive(true);
              sm.mcast.post();
            };
            document.head.appendChild(js_j);
          } else {
            //sm.mcast.receive(true);
          }
        } else {
          // tool methods
          let el = document.querySelector(".edit.sel");
          if (el != null && title != "fa-layer-group") {
            let val = sm.tools.set(el, title);
            sm.mcast.add(el.id, title, { value: val });
          }
        }
      }
    },
    file: function () {
      document.getElementById("img").onchange = document.getElementById(
        "txt"
      ).onchange = function (evt) {
        //stackoverflow.com/questions/3814231/
        var tgt = evt.target || window.event.srcElement,
          files = tgt.files;

        // FileReader support
        if (FileReader && files && files.length) {
          let dst = document.getElementById(tgt.id + "Dst");
          dst.innerHTML = "";
          for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let fr = new FileReader();
            fr.onload = function () {
              let div = document.createElement("div");
              div.classList.add("ico", "fas", encodeURI(file.name));
              if (tgt.id == "txt") {
                // type text
                let txt = document.createElement("textarea");
                div.classList.add("txt", "fa-font");
                div.appendChild(txt);
                txt.innerText = fr.result;
              } else {
                // type image

                let img = document.createElement("img");
                div.classList.add("art", "fa-image");

                img.onload = function () {
                  if (
                    (file.type == "image/gif" ||
                      file.type.indexOf("svg") > -1) &&
                    file.size <= 80000
                  ) {
                    // size <=80kb, native gif or svg
                    //div.appendChild(img);
                    div.style.backgroundImage = "url(" + img.src + ")";
                  } else {
                    // reduce size and compress jpeg
                    let canvas = sm.tools.fileMax(img);
                    let imgMax = document.createElement("img");
                    imgMax.src = canvas.toDataURL("image/jpeg", 0.7);

                    // second pass...?
                    let res = new Blob([imgMax.src]).size;
                    if (res >= 160000) {
                      console.log("res exceed...?");
                    }

                    canvas = null;
                    div.style.backgroundImage = "url(" + imgMax.src + ")";
                    //div.appendChild(imgMax);
                  }
                };

                img.src = fr.result;
              }

              dst.appendChild(div);
              sm.interact.drag(div);
            };

            // file read as text or image
            if (tgt.id == "txt") {
              fr.readAsText(file);
            } else {
              fr.readAsDataURL(file);
            }
          }
        }
      };
    },
    fileMax: function (img) {
      var MAX_ = sm.var.unit * 4;

      var width = img.width;
      var height = img.height;

      // Change the resizing logic
      if (width > height) {
        if (width > MAX_) {
          height = height * (MAX_ / width);
          width = MAX_;
        }
      } else {
        if (height > MAX_) {
          width = width * (MAX_ / height);
          height = MAX_;
        }
      }

      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      return canvas;
    },
    color: function () {
      document
        .getElementById("fa-eye-dropper")
        .addEventListener("input", function (event) {
          let st = " -0.25rem 0 0 -1px inset";
          sm.var.tools.querySelector(".fa-eye-dropper").style.boxShadow =
            event.target.value + st;

          let el = document.querySelector(".edit.sel");
          if (el != null) {
            let col = event.target.value;
            el.firstElementChild.style.color = col;
            let path = el.querySelector("svg path:last-child");
            path && (path.style.fill = col);
            sm.mcast.add(el.id, "fa-eye-dropper", { value: col });
          }
        });
    },
    render: function (output) {
      console.log("render gif");
      // css link rel=stylesheet must be crossorigin
      document.body.classList.add("render");
      output.innerHTML = "";

      // reduce filesize
      let sz = sm.var.stage.getBoundingClientRect();
      let w = sz.width / 2;
      let h = sz.height / 2;
      // time progress
      let prog = {
        total: 1000,
        step: 250
      };
      prog.load = prog.queue = prog.total / prog.step;

      let duration = setInterval(function () {
        // frame every 0.2 seconds for 1 second
        let frames = output.getElementsByTagName("img");

        // img*=gif to canvas for frames
        //let gifs = sm.var.stage.querySelectorAll("img[src*='gif']");

        if (prog.queue > 0) {
          prog.queue--;
          domtoimage
            .toJpeg(sm.var.stage, { quality: 0.5 })
            .then(function (dataUrl) {
              var img = new Image();
              img.onload = function () {
                prog.load--;
              };
              img.src = dataUrl;
              output.appendChild(img);
            })
            .catch(function (error) {
              console.error("error", error);
            });
        } else if (prog.load === 0) {
          clearInterval(duration);
          composite(frames);
        }
      }, prog.step);

      function composite(frames) {
        gifshot.createGIF(
          {
            images: Array.from(frames),
            gifWidth: w,
            gifHeight: h,
            // The amount of time (10 = 1s) to stay on each frame
            frameDuration: prog.step / 10,
            sampleInterval: 20
          },
          function (obj) {
            if (!obj.error) {
              document.body.classList.remove("render");
              output.innerHTML = "";

              let base64 = obj.image,
                link = document.createElement("a"),
                gif = document.createElement("img");
              gif.src = link.href = base64;
              link.append(gif);
              link.download = "sm_render_" + Date.now() + ".gif";
              link.target = "_blank";
              output.appendChild(link);
            }
          }
        );
      }
    }
  },
  mcast: {
    url: function () {
      //httprelay.io/features/mcast/
      let mcastId = document.getElementById("mcastId").value;
      return "//demo.httprelay.io/mcast/" + mcastId;
    },
    xhr: null,
    log: {
      uid: "u" + Date.now(),
      id: 0,
      time: 0,
      last: {},
      events: []
    },
    LZW: {
      en: function (c) {
        var x = "charCodeAt",
          b,
          e = {},
          f = c.split(""),
          d = [],
          a = f[0],
          g = 256;
        for (b = 1; b < f.length; b++)
          (c = f[b]),
            null != e[a + c]
              ? (a += c)
              : (d.push(1 < a.length ? e[a] : a[x](0)),
                (e[a + c] = g),
                g++,
                (a = c));
        d.push(1 < a.length ? e[a] : a[x](0));
        for (b = 0; b < d.length; b++) d[b] = String.fromCharCode(d[b]);
        return d.join("");
      },
      de: function (b) {
        let f, o;
        var a,
          e = {},
          d = b.split(""),
          c = (f = d[0]),
          g = [c],
          h = (o = 256);
        for (b = 1; b < d.length; b++)
          (a = d[b].charCodeAt(0)),
            (a = h > a ? d[b] : e[a] ? e[a] : f + c),
            g.push(a),
            (c = a.charAt(0)),
            (e[o] = f + c),
            o++,
            (f = a);
        return g.join("");
      }
    },
    add: function (idx, type, opts = {}) {
      if (!idx || !type) {
        return;
      }
      // log event
      let entryNew = {
        idx: idx,
        type: type
        // events granular via Date.now()...?
      };
      // flatten
      for (var key in opts) {
        if (opts[key] != undefined) {
          entryNew[key] = opts[key];
        }
      }
      // differ
      let events = sm.mcast.log.events;
      for (let i = events.length - 1; i > 0; i--) {
        let entryOld = events[i];
        if (entryOld.idx == entryNew.idx) {
          // remove stale duplicates
          let blacklist =
            // sort
            entryNew.type == "fa-level-up-alt" ||
            entryNew.type == "fa-level-down-alt" ||
            // draw
            entryNew.type == "canvas" ||
            entryNew.type == "svg" ||
            entryNew.type == "path" ||
            (entryNew.type == "fa-eraser" &&
              (entryNew.value == "svg" || entryNew.value == "path"));
          let criteria = entryOld.type == entryNew.type && !blacklist;
          if (criteria || entryNew.type == "fa-trash-alt") {
            entryOld = null;
            events.splice(i, 1);
          }
        }
      }

      events.push(entryNew);
    },
    post: function () {
      setInterval(function () {
        // opt1: clearInterval if no receive?
        // opt2: only send if xhr state active
        let log = sm.mcast.log;
        if (log.events.length && sm.mcast.xhr) {
          log.time = Date.now();
          console.log("post: ", log);
          $.ajax({
            url: sm.mcast.url(),
            type: "POST",
            data: JSON.stringify(log),
            contentType: "text/plain"
          });
          log.events = [];
        }
      }, 10000);
    },
    receive: function (fromOldest) {
      if (sm.mcast.xhr) sm.mcast.xhr.abort();
      let url = fromOldest
        ? sm.mcast.url() + "?SeqId=0&nocache=" + $.now()
        : sm.mcast.url();

      sm.mcast.xhr = $.get(url)
        .done((data) => {
          let user = JSON.parse(data);
          console.log("user", user);
          let log = sm.mcast.log;
          if (user.uid == log.uid || user.time == log.last.time) {
            // abort if stale cookie or same user id
            console.log("expired");
            return;
          }
          log.last = {
            uid: user.uid,
            time: user.time
          };

          // event queue
          for (let i = 0; i < user.events.length; i++) {
            let entry = user.events[i];
            console.log("entry", i, entry);
            // synchronize stage (create or update)
            let el = sm.var.stage.querySelector("#" + entry.idx);
            let type = entry.type;
            if (type == "drop" && el == null) {
              // if corrupt: fileMAX, LZW.en, post(setInterval), and xhr.abort
              let sel = document.createElement("div");
              let de = sm.mcast.LZW.de(entry.value);
              sel.innerHTML = de;
              sel = sel.firstChild;
              sel.classList.remove("edit");
              // element to stage
              sm.interact.drag(sel);
              sm.interact.resize(sel);
              sm.var.stage.appendChild(sel);
            } else if (el != null) {
              // io.edit
              switch (type) {
                case "canvas":
                  el = el.querySelector("canvas");
                  sm.stage.canvas(el, entry.x, entry.y, entry.col);
                  break;
                case "svg":
                case "path":
                  el = el.querySelector("svg");
                  sm.stage.svg(el, entry.x, entry.y, entry.col, entry.edit);
                  break;
                case "textarea":
                  el = el.querySelector("textarea");
                  el.value = entry.value;
                  break;
                default:
                  sm.tools.set(el, type, entry);
              }
            }
          }
        })
        .always(() => sm.mcast.receive());
    }
  }
};

sm.init();

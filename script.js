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
              restriction: "#" + sm.var.stage.id,
              endOnly: true
            })
          ]
        })
        .on("dragmove", function (event) {
          let target = event.target;
          // get previous
          let x = parseFloat(target.getAttribute("data-x")) || 0;
          let y = parseFloat(target.getAttribute("data-y")) || 0;
          x += event.dx;
          y += event.dy;
          // set position
          target.style.transform = "translate(" + x + "px, " + y + "px)";
          target.setAttribute("data-x", x);
          target.setAttribute("data-y", y);
        })
        .on("dragend", function (event) {
          let target = event.target;
          if (target.id != "tools") {
            // io.dragmove
            sm.mcast.add(target.id, event.type, {
              x: target.getAttribute("data-x"),
              y: target.getAttribute("data-y")
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
            Math.round((min / (sm.var.unit / 2)) * 2) / 2
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
          let color = document.getElementById("color").value;
          //clone.style.cursor = clone.style.transform = "";
          clone.style.color = color;
          clone.style.fill = color;

          // event listeners
          sm.interact.drag(wrap);
          sm.interact.resize(wrap);

          // drop clone
          wrap.id = sm.mcast.uid + "_" + sm.mcast.id++;
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
      //keydown while drag?
      document.addEventListener("keyup", function (e) {
        let el = e.target;
        let name = el.nodeName.toLowerCase();

        if (name == "textarea") {
          // io.textarea
          sm.mcast.add(el.closest(".sel").id, name, {
            value: el.value
          });
        } else if (name == "body") {
          // body
          el = sm.var.stage.querySelector(".sel.edit");
          let title, val;
          if (el) {
            if (e.key == "Delete" || e.key == "Backspace") {
              title = "fa-trash-alt";
            } else if (e.key == "[" || e.key == "]") {
              title = "fa-sort-amount-down";
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

              let scale = Math.min(
                width - (width % sm.var.unit),
                height - (height % sm.var.unit)
              );
              //let scale = Math.round(min)/sm.var.unit;
              val = {
                width: width + "px",
                height: height + "px",
                scale: Math.round(scale * 2) / 2
              };
              //console.log(val);
            } else if (e.key == "Tab") {
              //  e.preventDefault();
              //  el = sm.var.stage.querySelector(".edit");
              //  //TEST
              //  let dir = (el && el.nextElementSibling) || sm.var.stage.querySelector(".sel") ;
              //  if (dir) {
              //    el && el.classList.remove("edit");
              //    dir.classList.add("edit");
              //  }
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
        let col = document.getElementById("erase").checked
          ? "transparent"
          : document.getElementById("color").value;

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
        el = document.querySelector("#" + el + " canvas");
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
      //codepen.io/GreenSock/pen/wvgGxEr
      //codepen.io/GreenSock/pen/8fcb337385d0f1e401a66f260cf73e76
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
      let title = media.className.match(fa)[0];

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
        case "fa-sort-amount-down":
          if (el.previousElementSibling) {
            el.parentNode.insertBefore(el, el.previousElementSibling);
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
        case "fa-fill":
          val = val ? val.value : document.getElementById("color").value;
          media.style.color = val;
          if (title == "fa-draw-polygon") {
            media = media.querySelector("svg path:last-child");
            media && (media.style.fill = val);
          }
          break;
        case "fa-play-circle":
          // animate.css 3.7.0+ honors "prefers-reduced-motion"
          let animate = document.getElementById("animate");
          val = val ? val.value : animate.selectedOptions[0].value;
          for (let i = 0; i < animate.length; i++) {
            media.classList.remove(animate.options[i].value);
          }
          media.classList.add(val);
          break;
        case "fa-asterisk":
          // set title
          val = val ? val.value : document.getElementById("meta").value;
          el.setAttribute("data-meta", val);
          // set property
          media = media.firstElementChild || media;

          if (title == "fa-link") {
            // set hyperlink
            media.setAttribute("src", val);
          } else if (title == "fa-external-link-alt") {
            // set href
            media.setAttribute("href", val);
          } else {
            if (val.charAt(0) == ".") {
              // set onionskin if prefix match
              let group = sm.var.stage.querySelectorAll(
                "[data-meta='" + val + "']"
              );
              let dur = 0.25;
              for (let i = 0; i < group.length; i++) {
                let el = group[i];
                el.classList.remove("onion");
                el.style.removeProperty("animation-delay");
                el.style.removeProperty("animation-duration");

                setTimeout(() => {
                  // bug with set property timing
                  el.classList.add("onion");
                  el.style.setProperty("animation-delay", i * dur + "s");
                  el.style.setProperty(
                    "animation-duration",
                    dur * group.length + "s"
                  );
                }, 2000);
              }
            } else {
              el.classList.remove("onion");
            }
          }
          break;
        default:
      }

      return val;
    },
    label: function (e) {
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
        if (checkbox && !checkbox.disabled) {
          label.classList.toggle("active");
        }

        if (title == "fa-expand" || title == "fa-adjust") {
          // ui theme
          document.body.classList.toggle(title.slice(3));
        } else if (title == "fa-film") {
          if (typeof domtoimage != "undefined") {
            sm.tools.render(document.getElementById("frames"));
          } else {
            let js_dti = document.createElement("script");
            js_dti.src =
              "//cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js";
            js_dti.onload = function () {
              let js_gs = document.createElement("script");
              js_gs.src =
                "//cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js";
              js_gs.onload = function () {
                sm.tools.render(document.getElementById("frames"));
              };
              document.head.appendChild(js_gs);
            };
            document.head.appendChild(js_dti);
          }
        } else if (title == "fa-running") {
          if (label.classList.contains("active")) {
            console.log("HTTPRelay mcast");
            if (sm.mcast.getXhr == undefined) {
              // inject jquery?
              let js_j = document.createElement("script");
              js_j.src = "//code.jquery.com/jquery-3.6.0.min.js";
              js_j.onload = function () {
                sm.mcast.receive(true);
                sm.mcast.post();
              };
              document.head.appendChild(js_j);
              label.querySelector("input[type=checkbox]").disabled = true;
            }
          } else {
            // sm.mcast.getXhr.abort(?)
          }
        } else {
          // tool methods
          let el = document.querySelector(".edit.sel");
          if (el != null) {
            let val = sm.tools.set(el, title);
            val = val ? { value: val } : {};
            sm.mcast.add(el.id, title, val);
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
      sm.var.tools
        .querySelector("#color")
        .addEventListener("input", function (event) {
          let st = " -0.25rem 0 0 -1px inset";
          sm.var.tools.querySelector(".fa-fill").style.boxShadow =
            event.target.value + st;

          let el = document.querySelector(".edit.sel");
          if (el != null) {
            let col = event.target.value;
            el.firstElementChild.style.color = col;
            let path = el.querySelector("svg path:last-child");
            path && (path.style.fill = col);
            sm.mcast.add(el.id, "fa-fill", { value: col });
          }
        });
    },
    render: function (output) {
      console.log("render frames to gif");
      // link crossorigin rel=stylesheet
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
              output.innerHTML = "";

              let base64 = obj.image,
                link = document.createElement("a"),
                gif = document.createElement("img");
              gif.src = link.href = base64;
              link.append(gif);
              link.download = "sm_render_"+Date.now()+".gif";
              link.target = "_blank";
              output.appendChild(link);
            }
          }
        );
      }
    }
  },
  mcast: {
    //httprelay.io/features/mcast/
    uid: "u" + Date.now(),
    id: 0,
    mcastUrl: "//demo.httprelay.io/mcast/stockmeme_cp1",
    getXhr: undefined, // global history
    history: { time: 0, events: [] }, // local history
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

      let entryNew = {
        idx: idx,
        type: type
        //time: Date.now(),//events filters?
      };
      for (var key in opts) {
        entryNew[key] = opts[key];
      }

      let events = sm.mcast.history.events;
      for (let i = events.length - 1; i > 0; i--) {
        // trash stale duplicates, but ignore draw
        let entryOld = events[i];
        if (entryOld.idx == entryNew.idx) {
          let stale =
            entryOld.type == entryNew.type &&
            entryNew.type != "canvas" &&
            entryNew.type != "svg" &&
            entryNew.type != "path" &&
            !(entryNew.type == "fa-eraser" && entryNew.value == "path");
          if (stale || entryNew.type == "fa-trash-alt") {
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
        let history = sm.mcast.history;
        if (history.events.length && sm.mcast.getXhr) {
          history.uid = sm.mcast.uid;
          history.time = Date.now();
          console.log("post: ", history);
          $.ajax({
            url: sm.mcast.mcastUrl,
            type: "POST",
            data: JSON.stringify(history),
            contentType: "text/plain"
          }); // send sm history
          history.events = [];
        }
        //fileMAX, LZW.en, and setInterval determine a broken image
      }, 10000);
    },
    receive: function (fromOldest) {
      //$.ajaxSetup({
      //  xhrFields: {
      // SeqId (OOO) passed via cookies
      //    withCredentials: true
      //  }
      //});
      if (sm.mcast.getXhr) sm.mcast.getXhr.abort();
      let url = fromOldest
        ? sm.mcast.mcastUrl + "?SeqId=0&nocache=" + $.now()
        : sm.mcast.mcastUrl;
      let last = sm.mcast.getXhr
        ? JSON.parse(sm.mcast.getXhr.responseText)
        : false;
      sm.mcast.getXhr = $.get(url)
        .done((data) => {
          let history = JSON.parse(data);
          if (history.time == last.time || history.uid == sm.mcast.uid) {
            // abort if stale cookie or same user id
            console.log("expired");
            return;
          }

          // event queue
          for (let i = 0; i < history.events.length; i++) {
            let entry = history.events[i];
            console.log("entry", i, entry);

            //idx, type, value, etc.
            let el = sm.var.stage.querySelector("#" + entry.idx);
            let type = entry.type;
            if (type == "drop" && el == null) {
              let sel = document.createElement("div");
              let de = sm.mcast.LZW.de(entry.value);
              sel.innerHTML = de;
              sel = sel.firstChild; // or div.childNodes
              sel.classList.remove("edit");
              // event listeners
              sm.interact.drag(sel);
              sm.interact.resize(sel);

              sm.var.stage.appendChild(sel);
            } else if (el != null) {
              switch (type) {
                // io.edit
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
                //case "fa-eraser":
                //sm.tools.set();
                //eraser
                //break;
                // io.labels
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
console.log("Shortcuts:","Delete/Backspace","[/]","Arrow Keys", "+/-", "")

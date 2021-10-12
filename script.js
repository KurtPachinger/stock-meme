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

    sm.tools.file();
    sm.tools.color();
    sm.stage.click();
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
              min: { width: sm.var.unit / 2, height: sm.var.unit / 2 },
              max: { width: sm.var.unit * 8, height: sm.var.unit * 8 }
            })
          ]
        })
        .on("resizemove", function (event) {
          let target = event.target;
          target.style.width = event.rect.width + "px";
          target.style.height = event.rect.height + "px";
          //font awesome scale
          let min = Math.min(event.rect.width, event.rect.height) * 2;
          //target.style.fontSize = min + "px";
          target.setAttribute("data-scale", Math.round(min) / sm.var.unit);
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

          // clone attr
          let clone = original.cloneNode(true);
          clone.classList.remove("ico", "drop-target");
          clone.classList.add("animated", "infinite");
          clone.removeAttribute("data-x");
          clone.removeAttribute("data-y");
          let color = document.getElementById("color").value;
          clone.style = "";
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
        .on("dropactivate", function (event) {
          var ico = event.relatedTarget;
          ico.classList.add("drop-target");
          event.target.classList.add("drop-active");
        })
        .on("dropdeactivate", function (event) {
          var ico = event.relatedTarget;
          ico.classList.remove("drop-target");
          event.target.classList.remove("drop-active");
          // reset icon
          ico.removeAttribute("style");
          ico.removeAttribute("data-x");
          ico.removeAttribute("data-y");
        });
    }
  },

  stage: {
    click: function () {
      sm.var.stage.addEventListener("pointerdown", function (e) {
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

        let name = e.target.nodeName.toLowerCase();
        if (name == "textarea") {
          // type
          sm.stage.type(e);
        } else {
          // draw
          sm.stage.draw(e);
        }
      });
    },
    type: function (e) {
      let el = e.target;

      if (e.type == "keyup") {
        let name = el.nodeName.toLowerCase();
        // io.textarea
        sm.mcast.add(el.closest(".sel").id, name, {
          value: el.value
        });
      }

      // event handlers
      el.addEventListener("keyup", sm.stage.type);
      el.onblur = function () {
        el.removeEventListener("keyup", sm.stage.type);
        el.onblur = null;
      };
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

        if (name == "canvas") {
          sm.stage.canvas(el, x, y, col);
          // event handlers, should include elements removed?
          el.addEventListener("pointermove", sm.stage.draw);
          el.onpointerup = el.onpointerleave = function () {
            sm.stage.draw(el);
          };
        } else if (name == "svg") {
          sm.stage.svg(el, x, y, col);
        }

        // io.canvas/svg
        sm.mcast.add(el.closest(".sel").id, name, {
          x: x,
          y: y,
          col: col
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

      //console.log("raster", e, canvas);
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
    svg: function (el, x, y, col) {
      if (typeof el == "string") {
        el = document.querySelector("#" + el + " svg");
        if (!el) {
          return;
        }
      }

      // size native
      let bound = el.getBoundingClientRect();
      let w = bound.width / el.viewBox.baseVal.width;
      let h = bound.height / el.viewBox.baseVal.height;
      // draw responsive
      var point = el.createSVGPoint();
      point.x = x / w;
      point.y = y / h;
      // add point
      let polygon = el.children[0];
      polygon.points.appendItem(point);
    }
  },
  tools: {
    set: function (el, title, val = null) {
      //console.log(el,title,val)
      if (title == "fa-trash") {
        let canvas = el.querySelector("canvas");
        if (canvas) {
          sm.stage.draw(canvas);
        }

        interact(el).unset();
        el.parentNode.removeChild(el);
        el = null;
      } else if (title == "fa-sort-amount-down") {
        if (el.previousElementSibling) {
          el.parentNode.insertBefore(el, el.previousElementSibling);
        }
      } else if (title == "fa-fill") {
        val = val ? val : document.getElementById("color").value;
        el.firstElementChild.style.color = val;
        el.firstElementChild.style.fill = val;
      } else if (title == "fa-video") {
        //console.log(title, val);
        // animation enabled (3.7.0+ honors "prefers-reduced-motion")
        let art = el.firstElementChild;
        // animation style swap
        let efx = [
          "none",
          "bounce",
          "flash",
          "pulse",
          "rubberBand",
          "headShake",
          "swing",
          "tada",
          "shake",
          "wobble",
          "jello",
          "flip"
        ];
        val = val ? val : efx[Math.floor(Math.random() * efx.length)];
        for (let i = 0; i < efx.length; i++) {
          art.classList.remove(efx[i]);
        }
        art.classList.add(val);
      } else if (title == "fa-info-circle") {
        // set title
        val = val ? val : document.getElementById("meta").value;
        el.setAttribute("data-meta", val);
        // set property
        let media = el.firstElementChild.firstElementChild;
        let type = media.nodeName.toLowerCase();
        if (media) {
          if (type == "a") {
            // set hyperlink
            media.setAttribute("href", val);
          } else if (type == "canvas") {
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
        }
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
        const regex = /(fa)(-[a-z]+)+/g;
        title = title.value.match(regex)[0];

        // tool state

        let checkbox = label.querySelector("input[type=checkbox]");
        if (checkbox && !checkbox.disabled) {
          label.classList.toggle("active");
        }

        if (title == "fa-expand" || title == "fa-adjust") {
          // ui theme
          document.body.classList.toggle(title.slice(3));
        } else if (title == "fa-running") {
          if (label.classList.contains("active")) {
            console.log("HTTPRelay mcast");
            if (sm.mcast.getXhr == undefined) {
              // inject jquery?
              let js = document.createElement("script");
              js.src = "//code.jquery.com/jquery-3.6.0.min.js";
              js.onload = function () {
                sm.mcast.receive(true);
                sm.mcast.post();
              };
              document.head.appendChild(js);
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
            sm.mcast.add(el.id, title, { value: val });
          }
        }
      }
    },
    file: function () {
      document.getElementById("camSrc").onchange = function (evt) {
        //stackoverflow.com/questions/3814231/
        var tgt = evt.target || window.event.srcElement,
          files = tgt.files;

        // FileReader support
        if (FileReader && files && files.length) {
          let dst = document.getElementById("camDst");
          dst.innerHTML = "";
          for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let fr = new FileReader();
            fr.onload = function () {
              let div = document.createElement("div");
              let img = document.createElement("img");
              div.classList.add(
                "ico",
                "fas",
                "art",
                "fa-file-image",
                encodeURI(file.name)
              );

              img.onload = function () {
                //console.log(file);
                if (file.type == "image/gif" && file.size <= 56000) {
                  // gif under 56kb
                  div.appendChild(img);
                } else {
                  let canvas = sm.tools.fileMax(img);
                  let imgMax = document.createElement("img");
                  imgMax.src = canvas.toDataURL(file.type, 0.5);
                  canvas = null;
                  div.appendChild(imgMax);
                }

                dst.appendChild(div);
                sm.interact.drag(div);
              };

              img.src = fr.result;
            };

            fr.readAsDataURL(file);
          }
        }

        // Not supported
        else {
          // fallback -- perhaps submit the input to an iframe and temporarily store
          // them on the server until the user's session ends.
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
            el.firstElementChild.style.fill = col;
            sm.mcast.add(el.id, "fa-fill", { value: col });
          }
        });
    }
  },
  mcast: {
    //httprelay.io/features/mcast/
    uid: "u" + Date.now(),
    id: 0,
    mcastUrl: "//demo.httprelay.io/mcast/stockmeme_cp",
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
      if (!idx) {
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
            entryOld.type != "canvas" &&
            entryOld.type != "svg";
          if (stale || entryNew.type == "fa-trash") {
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
            let id = entry.idx.slice(0, entry.idx.indexOf("_"));
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
                // io.interact
                case "drop":
                  break;
                case "resizeend":
                  el.style.width = entry.width;
                  el.style.height = entry.height;
                  el.setAttribute("data-scale", entry.scale);
                  break;
                case "dragend":
                  el.setAttribute("data-x", entry.x);
                  el.setAttribute("data-y", entry.y);
                  el.style.transform =
                    "translate(" + entry.x + "px, " + entry.y + "px)";
                  break;
                // io.edit
                case "canvas":
                  el = el.querySelector("canvas");
                  sm.stage.canvas(el, entry.x, entry.y, entry.col);
                  break;
                case "svg":
                  el = el.querySelector("svg");
                  sm.stage.svg(el, entry.x, entry.y, entry.col);
                  break;
                case "textarea":
                  el = el.querySelector("textarea");
                  el.value = entry.value;
                  //sm.stage.type(el);
                  break;
                // io.labels
                case "fa-trash":
                case "fa-sort-amount-down":
                case "fa-info-circle":
                case "fa-fill":
                case "fa-video":
                  sm.tools.set(el, type, entry.value);
                  break;
                default:
                  console.log("?");
              }
            }
          }
        })
        .always(() => sm.mcast.receive());
    }
  }
};

sm.init();

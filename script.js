//todo: html2canvas, gifshot
import interact from "//cdn.interactjs.io/v1.10.11/interactjs/index.js";

const unit = 64;
let unitPx = unit / 2 + "px ";
document.querySelector("#artboard").style.backgroundSize = unitPx + unitPx;

drag(document.getElementById("tools"));

let ico = document.querySelectorAll("#tools .ico");
for (let i = 0; i < ico.length; i++) {
  // clone #tool to #artboard
  drag(ico[i]);
}

//stackoverflow.com/questions/63698667/cant-drag-and-drop-to-another-div-using-interact-js
interact("#artboard").dropzone({
  accept: ".ico",
  ondrop: function (event) {
    var original = event.relatedTarget;
    let cr = original.getClientRects()[0];
    //console.log(cr);

    let wrap = document.createElement("div");

    var clone = event.relatedTarget.cloneNode(true);
    clone.style = "";
    wrap.setAttribute("data-x", cr.x);
    wrap.setAttribute("data-y", cr.y);

    wrap.style = "transform:translate(" + cr.x + "px," + cr.y + "px);";
    // offset from layout flow
    //clone.style.position = "absolute";
    //clone.style.left = (original.offsetLeft + tools.x ) + "px";
    //clone.style.top = (original.offsetTop + tools.y) + "px";
    // set styles
    clone.style.color = document.getElementById("color").value;
    clone.classList.remove("ico");
    wrap.classList.add("sel");
    clone.classList.remove("drop-target");

    // event listeners
    drag(wrap);
    resize(wrap);
    if (clone.classList.contains("fa-edit")) {
      raster(clone.querySelector("canvas"));
    } else if (clone.classList.contains("fa-draw-polygon")) {
      vector(clone.querySelector("svg"));
    }
    // drop clone
    if (clone.classList.contains("txt")) {
      clone.setAttribute("contentEditable", true);
    }
    wrap.appendChild(clone);
    document.querySelector("#artboard").appendChild(wrap);
  },
  ondropactivate: function (event) {
    var ico = event.relatedTarget;
    ico.classList.add("drop-target");
    event.target.classList.add("drop-active");
  },
  ondropdeactivate: function (event) {
    var ico = event.relatedTarget;
    ico.classList.remove("drop-target");
    event.target.classList.remove("drop-active");
    // reset icon
    ico.removeAttribute("style");
    ico.removeAttribute("data-x");
    ico.removeAttribute("data-y");
  }
});

let artboard = document.getElementById("artboard");
artboard.addEventListener("pointerdown", function (e) {
  let edits = document.querySelectorAll(".edit");
  for (let i = 0; i < edits.length; i++) {
    edits[i].classList.remove("edit");
  }

  let edit = e.target;

  if (edit != artboard) {
    if (!edit.classList.contains("sel")) {
      edit = edit.closest(".sel");
    }
  }

  edit.classList.add("edit");
});

function drag(element) {
  interact(element)
    .draggable({
      ignoreFrom: "label",
      modifiers: [
        interact.modifiers.snap({
          targets: [interact.snappers.grid({ x: unit / 2, y: unit / 2 })],
          relativePoints: [
            { x: 0, y: 0 }, // top-left,
            //{ x: 0.5, y: 0.5 },   // center
            { x: 1, y: 1 } // bottom-right
          ]
        })
      ]
    })
    .on("dragmove", function (event) {
      let target = event.target;

      let x = parseFloat(target.getAttribute("data-x")) || 0;
      let y = parseFloat(target.getAttribute("data-y")) || 0;
      x += event.dx;
      y += event.dy;
      // set position
      target.style.transform = "translate(" + x + "px, " + y + "px)";
      target.setAttribute("data-x", x);
      target.setAttribute("data-y", y);
    });
}

function resize(element) {
  interact(element).resizable({
    edges: { left: false, right: true, bottom: true, top: false },
    preserveAspectRatio: true,
    //invert: 'preserve',
    listeners: {
      move(event) {
        let target = event.target;
        target.style.width = event.rect.width + "px";
        target.style.height = event.rect.height + "px";
        //font awesome scale
        let min = Math.min(event.rect.width, event.rect.height);
        target.style.fontSize = min + "px";
      }
    },
    modifiers: [
      interact.modifiers.snapSize({
        targets: [
          interact.snappers.grid({
            x: unit / 2,
            y: unit / 2,
            range: Infinity
          })
        ]
      }),
      interact.modifiers.restrictSize({
        min: { width: unit, height: unit },
        max: { width: unit * 8, height: unit * 8 }
      })
    ]
  });
}

// UI CLICK HANDLERS
let labels = document.querySelectorAll("label");
for (let i = 0; i < labels.length; i++) {
  let label = labels[i];
  label.addEventListener("click", function (e) {
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
    }

    if (title.contains("fa-expand")) {
      document.getElementById("tools").classList.toggle("zoom");
    }else if (title.contains("fa-adjust")) {
      document.body.classList.toggle("dark");
    }

    let el = document.querySelector(".edit");
    if (el === artboard) {
      //todo: edits global/local
      return;
    }

    if (title.contains("fa-trash")) {
      interact(el).unset();
      el.parentNode.removeChild(el);
    } else if (title.contains("fa-layer-group")) {
      if (el.nextElementSibling) {
        el.parentNode.insertBefore(el.nextElementSibling, el);
      }
    } else if (title.contains("fa-fill")) {
      el.firstElementChild.style.color = document.getElementById("color").value;
    } else if (title.contains("fa-running")) {
      // animation enabled
      let art = el.firstElementChild;
      art.classList.add("animated", "infinite");
      // animation style swap
      let efx = [
        "bounce",
        "flash",
        "pulse",
        "rubberBand",
        "headShake",
        "swing",
        "tada",
        "wobble",
        "jello"
      ];
      var item = efx[Math.floor(Math.random() * efx.length)];
      for (let i = 0; i < efx.length; i++) {
        art.classList.remove(efx[i]);
        art.classList.add(item);
      }
    }
  });
}

document.getElementById("camSrc").onchange = function (evt) {
  //stackoverflow.com/questions/3814231/
  var tgt = evt.target || window.event.srcElement,
    files = tgt.files;

  // FileReader support
  if (FileReader && files && files.length) {
    let dst = document.getElementById("camDst");
    dst.innerHTML = "";
    for (let i = 0; i < files.length; i++) {
      let fr = new FileReader();
      fr.onload = function () {
        let div = document.createElement("div");
        let img = document.createElement("img");
        div.classList.add("ico", "art", encodeURI(files[i].name));

        img.src = fr.result;
        div.appendChild(img);
        dst.appendChild(div);
        drag(div);
      };
      fr.readAsDataURL(files[i]);
    }
  }

  // Not supported
  else {
    // fallback -- perhaps submit the input to an iframe and temporarily store
    // them on the server until the user's session ends.
  }
};

document.querySelector("#color").addEventListener("input", function (event) {
  let st = " -0.25rem 0 0 -1px inset";
  document.querySelector(".fa-fill").style["boxShadow"] =
    event.target.value + st;

  let el = document.querySelector(".edit");
  if (el != artboard) {
    el.firstElementChild.style.color = document.getElementById("color").value;
  }
});

function vector(el) {
  el.addEventListener("click", function (event) {
    //console.log(el, event);

    let bound = el.getBoundingClientRect();
    let w = bound.width / el.viewBox.baseVal.width;
    let h = bound.height / el.viewBox.baseVal.height;

    var point = el.createSVGPoint();
    point.x = event.offsetX / w;
    point.y = event.offsetY / h;

    let polygon = el.children[0];
    polygon.points.appendItem(point);
  });
}

function raster(el) {
  var pixelSize = unit / 2;

  interact(el).draggable({
    max: Infinity,
    maxPerElement: Infinity,
    origin: "self",
    modifiers: [
      interact.modifiers.snap({
        // snap to the corners of a grid
        targets: [interact.snappers.grid({ x: pixelSize, y: pixelSize })]
      })
    ],
    listeners: {
      // draw colored squares on move
      move: function (event) {
        let canvas = event.target;
        var ctx = canvas.getContext("2d");
        // calculate the angle of the drag direction
        var dragAngle = (180 * Math.atan2(event.dx, event.dy)) / Math.PI;

        // set color based on drag angle and speed
        ctx.fillStyle = document.getElementById("color").value;

        let bound = canvas.getBoundingClientRect();
        let w = bound.width / canvas.width;
        let h = bound.height / canvas.height;

        // draw squares
        ctx.fillRect(
          event.pageX / w - pixelSize / w / 2,
          event.pageY / h - pixelSize / h / 2,
          pixelSize / w,
          pixelSize / h
        );
      }
    }
  });
}
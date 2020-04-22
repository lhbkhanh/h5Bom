
// if desktop browser -> show game in frame
if(!/mobile|android|iphone|ipad/.test(window.navigator.userAgent.toLowerCase())) {
    var stylesheet = document.getElementById("stylesheet");
    stylesheet.href = "style-desktop.css";

    var GameDiv = document.getElementById("GameDiv");
    var GameCanvas = document.getElementById("GameCanvas");

    GameDiv.style.display = 'block';
    // set size for canvas
    // var w = window.innerWidth;
    var h = window.innerHeight - 30; // 10 = window.pageYOffset
    var ratio = 960 / 640;  // w/h -> game design resolution
    var h_new = h;          // fix height of window to height of game (desktop is always landscape)
    var w_new = Math.floor(h_new * ratio);
    // console.log("Desktop new w: " + w_new + " h:" + h_new);
    GameDiv.style.width = "" + w_new + "px";
    GameDiv.style.height = "" + h_new + "px";
    GameDiv.appendChild(GameCanvas);
}


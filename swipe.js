function touchEvents(el, callback) {

    function isMouse(e) {
        try {
            e.changedTouches[0];
        } catch (e) {
            return true;
        }
        return false;
    }

    var touchsurface = el,
        dir,
        swipeType,
        startX,
        startY,
        distX,
        distY,
        threshold = 100,    // Minimum distance to be considered a swipe
        restraint = 100,    // Maximum distance allowed at the same time in perpendicular direction
        allowedTime = 300,  // Maximum time allowed to travel that distance
        elapsedTime,
        startTime,
        mouseDown = false,
        handletouch = callback || function(evt, dir, phase, swipetype, distance) {};

    function touchStart(e) {
        var touchobj = isMouse(e) ? e : e.changedTouches[0],
            dist = 0;

        dir = 'none';
        swipeType = 'none';
        startX = touchobj.pageX;
        startY = touchobj.pageY;
        startTime = new Date().getTime();
        handletouch(e, 'none', 'start', 0, swipeType);

        if (isMouse(e)) {
            mouseDown = true;
        }
    }

    function touchMove(e) {
        e.preventDefault();

        if (isMouse(e) && !mouseDown) { // Prevent mousemove from firing before mousedown event is triggered
            return;
        }
        
        var touchobj = isMouse(e) ? e : e.changedTouches[0],
            axis;
            distX = touchobj.pageX - startX;
            distY = touchobj.pageY - startY;    

        if (Math.abs(distX) > Math.abs(distY)) {
            dir = (distX < 0) ? 'left' : 'right';
            axis = distX;
        }
        else {
            dir = (distY < 0) ? 'up' : 'down';
            axis = distY;
        }
        handletouch(e, dir, 'move', axis, swipeType);
    }

    function touchEnd(e) {
        e.preventDefault();

        var touchobj = isMouse(e) ? e : e.changedTouches[0];
            elapsedTime = new Date().getTime() - startTime;
      
        if (elapsedTime <= allowedTime) {
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
                swipeType = dir;
            }
            else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {
                swipeType = dir;
            }
        }
        handletouch(e, dir, 'end', (dir =='left' || dir =='right') ? distX : distY, swipeType);

        if (isMouse(e)) {
            mouseDown = false;
        }
    }

    addEvent(_this, 'touchstart', touchStart);
    addEvent(_this, 'touchmove', touchMove);
    addEvent(_this, 'touchend', touchEnd);

    if (o.mouseDrag) {
        addEvent(_this, 'mousedown', touchStart);
        addEvent(_this, 'mousemove', touchMove);
        addEvent(_this, 'mouseup', touchEnd);
    }
}
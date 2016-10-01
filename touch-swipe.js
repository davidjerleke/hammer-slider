function touchEvents(_this, options, callback) {
    'use strict';

    var o = {
        preventDefault: true,
        clicksAllowed: true,
        mouse: true,
        dragThreshold: 10 // Minimum distance to determine swipe direction
    };
        
    // Merge user options into defaults
    options && mergeObjects(o, options);

    var start = {},
        diff = {},
        direction,
        eventType,
        touchCallback = callback || function(evt, dir, phase, distance) {},
        support = {
            pointerEvents: !!window.navigator.pointerEnabled,
            msPointerEvents: !!window.navigator.msPointerEnabled
        },
        eventModel = (support.pointerEvents ? 1 : (support.msPointerEvents ? 2 : 0)),
        events = [
            ['touchstart', 'touchmove', 'touchend', 'touchcancel'], //touch events
            ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'], //pointer events
            ['MSPointerDown', 'MSPointerMove', 'MSPointerUp', 'MSPointerCancel'], //IE10 pointer events
            ['mousedown', 'mousemove', 'mouseup', false] //mouse events
        ],
        checks = [
            //touch events
            function(e) {
                //skip the event if it's multitouch or pinch move
                return (e.touches && e.touches.length > 1) || (e.scale && e.scale !== 1);
            },
            //pointer events
            function(e) {
                //Skip it, if:
                //1. event is not primary (other pointers during multitouch),
                //2. left mouse button is not pressed,
                //3. mouse drag is disabled and event is not touch
                return !e.isPrimary || (e.buttons && e.buttons !== 1) || (!o.mouse && e.pointerType !== 'touch' && e.pointerType !== 'pen');
            },
            //IE10 pointer events
            function(e) {
                //same checks as in pointer events
                return !e.isPrimary || (e.buttons && e.buttons !== 1) || (!o.mouse && e.pointerType !== e.MSPOINTER_TYPE_TOUCH && e.pointerType !== e.MSPOINTER_TYPE_PEN);
            },
            //mouse events
            function(e) {
                //skip the event if left mouse button is not pressed
                //in IE7-8 `buttons` is not defined, in IE9 LMB is 0
                return (e.buttons && e.buttons !== 1);
            }
        ];



    function mergeObjects(targetObj, sourceObject) {
        for (var key in sourceObject) {
            if (sourceObject.hasOwnProperty(key)) {
                targetObj[key] = sourceObject[key];
            }
        }
    }



    function addEvent(el, event, func, bool) {
        if (!event) return;
        el.addEventListener(event, func, !!bool);

        // Return remove to be able do detach anonymous function later
        return {
            remove: function() {
                removeEvent(el, event, func, bool);
            }
        };
    }



    function removeEvent(el, event, func, bool) {
        if (!event) return;
        el.removeEventListener(event, func, !!bool);
    }



    function preventDefault(event) {
        event.preventDefault ? event.preventDefault() : event.returnValue = false;
    }



    function getDiff(event) {
        diff = {
            X: (eventType ? event.clientX : event.touches[0].clientX) - start.X,
            Y: (eventType ? event.clientY : event.touches[0].clientY) - start.Y,
            time: new Date().getTime() - start.time
        };
    }



    function touchStart(event, type) {
        direction = '';
        firstTime = true;
        o.clicksAllowed = true;
        eventType = type;

        if (checks[eventType](event)) return;

        if (preventDefault && eventType) preventDefault(event);

        addEvent(document, events[eventType][1], touchMove);
        addEvent(document, events[eventType][2], touchEnd);
        addEvent(document, events[eventType][3], touchEnd);

        start = {
            X: eventType ? event.clientX : event.touches[0].clientX,
            Y: eventType ? event.clientY : event.touches[0].clientY,
            time: new Date().getTime()
        };

        for (var i in diff) {
            diff[i] = 0;
        }
        touchCallback(event, 'none', 'start', 0);
    }

    var firstTime = true,
        axis;

    function touchMove(event) {
        var distance;
        getDiff(event);

        if (firstTime) {
            if (o.dragThreshold < Math.abs(diff.X)) {
                firstTime = false;
                axis = 'X';
            } else if (o.dragThreshold < Math.abs(diff.Y)) {
                firstTime = false;
                axis = 'Y';
            }
        }

        if (!firstTime) {
            if (axis === 'X') {
                direction = (diff.X < 0) ? 'left' : 'right';
                distance = diff.X;
                if (preventDefault) preventDefault(event);
            } else if (axis === 'Y') {
                direction = (diff.Y < 0) ? 'up' : 'down';
                distance = diff.Y;
            }
        }
        touchCallback(event, direction, 'move', distance);
    }



    function touchEnd(event) {
        !o.clicksAllowed && event.target && event.target.blur && event.target.blur();

        removeEvent(document, events[eventType][1], touchMove);
        removeEvent(document, events[eventType][2], touchEnd);
        removeEvent(document, events[eventType][3], touchEnd);

        touchCallback(event, direction, 'end', (direction === 'left' || direction === 'right') ? diff.X : diff.Y);
    }



    function init() {
        addEvent(_this, events[eventModel][0], function(event) { // Bind touchstart
            touchStart(event, eventModel); 
        });
        addEvent(_this, 'dragstart', preventDefault); // Prevent stuff from dragging when using mouse
        
        if (o.mouse && !eventModel) { // Bind mousedown if necessary
            addEvent(_this, events[3][0], function(event) {
                touchStart(event, 3);
            });
        }

        addEvent(_this, 'click', function(event) { // No clicking during touch
            o.clicksAllowed ? touchCallback(event) : preventDefault(event);
        });
    }

    init();
}



/*var el = document.getElementById('slider');

touchEvents(el, {
    mouse: true,
}, function(e, dir, phase, distance, swipeType) {

});
*/
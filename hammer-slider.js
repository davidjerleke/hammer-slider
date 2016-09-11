(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());



/*
    TO FIX
    ------
    Slider stops after first slide if 
    stop after interaction is true and
    nothing is touched.

*/
function HammerSlider(_this, options) {
    'use strict';

    var slider = {},
        slideContainer,
        slideIndex,
        sliderWidth,
        dotWrap,
        offsetCount,
        nrOfSlides,
        prefixedTransform,
        circlePoints = {};

    var o = {
        slideShow: false,
        slideInterval: false,
        slideSpeed: 300,
        startSlide: 0,
        stopAfterInteraction: false,
        rewind: false,
        dots: false,
        slideSelector: undefined,
        containerSelector: undefined,
        dotWrapClass: undefined,
        dotActiveClass: undefined,
        mouseDrag: false
    };



    function mergeObjects(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    }



    function selectEl(element, selector, all) {
        return element['querySelector' + (all ? 'All' : '')](selector);
    }



    function addEvent(el, event, func, bool) {
        el.addEventListener(event, func, !!bool);
    }



    function addClass(el, className) {
        el.classList.add(className);
    }


    function removeClass(el, className) {
        el.classList.remove(className);
    }


    /*
    function makeTabbable(el, slideIndex) {
        addEvent(el, 'focus', function(e) {
            stopSlideshow();
            setPosition(slideIndex);
            _this.scrollLeft = 0;
        }, true);
    }
    */


    function prefixThis(prop) {
        var prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'],
            div = document.createElement('div');

        for (var i in prefixes) {
            if (typeof div.style[prefixes[i] + prop] !== 'undefined') {
                return prefixes[i] + prop;
            }
        }
        return false;
    }



    function transform(el, value, unit) {
        el.style[prefixedTransform] = 'translate3d(' + value + (unit ? unit : 'px') + ', 0, 0)';
    }



    function loopSlides(callback) {
        for (var i = 0; i < nrOfSlides; i++) {
            callback.call(slider, i);
        }
    }



    function getCurrentPosition() {
        var transform = window.getComputedStyle(slideContainer, null).getPropertyValue(prefixedTransform),
            matrixIndex = transform.match('3d') ? 12 : 4;   // 12 is for IE and 4 for other browsers

        return parseInt(transform.split(',')[matrixIndex]);
    }



    function move(direction) {
        var nextSlide = slideIndex + direction;
        
        if (o.rewind) {
            if (direction === 1) {
                if (nextSlide === nrOfSlides) {
                    nextSlide = 0;
                }
            } else {
                if (nextSlide < 0) {
                    nextSlide = nrOfSlides - 1;
                }
            }
        }
        setPosition(nextSlide);
    }



    function resetSlider(position) {
        var pos = (typeof position !== 'undefined') ? Math.abs(position) : o.startSlide;
        slideIndex = pos;

        if (!o.rewind) {
            circlePoints['1'] = {
                slide: 0,
                flipPoint: sliderWidth * (nrOfSlides - 2) * -1,
                toPos: nrOfSlides * 100,
            };
            circlePoints['-1'] = {
                slide: nrOfSlides - 1,
                flipPoint: 0,
                toPos: -100,
            };
        }

        loopSlides(function(i) {
            transform(this.slides[i], i * 100, '%');
        });

        transform(slideContainer, pos * 100 * -1, '%');
        firstTime = false;
    }



    function setPosition(nextSlide) {
        var next = nextSlide,
            slideDistance,
            direction;

        stopSlideshow();

        if (nextSlide === -1 || (nextSlide !== 0 && Math.abs(nextSlide) % nrOfSlides === 0)) {
            offsetCount++;
        }

        slideDistance = next * sliderWidth * -1;
        direction = (nextSlide < slideIndex) ? -1 : 1;
        slideIndex = next;

        if (o.dots) {
            setActiveDot(Math.abs(slideIndex % nrOfSlides));
        }
        slide(slideDistance, direction);
    }



    Math.easeOutQuad = function(t, b, c, d) {
        t /= d;
        return -c * t*(t-2) + b;
    };


    var lastDirection,
        firstTime = false;


    function slide(slideDistance, direction) {

        var currPos = getCurrentPosition(),
            currentTime = 0,
            start = currPos,
            change = slideDistance - start,
            increment = 20;

        if (!lastDirection) {
            lastDirection = direction;
        }

        function animate() {
            if (currentTime === o.slideSpeed) {
                if (slideIndex % nrOfSlides === o.startSlide) {
                    resetSlider();
                }
                if (o.slideShow && !o.stopAfterInteraction) {
                    startSlideshow();
                }
            } else {
                if (!o.rewind) {
                    var forward = circlePoints[1],
                        backward = circlePoints[-1];

                    /* Forward */
                    if (currPos < forward.flipPoint) {
                        backward.flipPoint = forward.flipPoint;

                        transform(slider.slides[forward.slide], forward.toPos, '%');
                        forward.flipPoint -= sliderWidth;
                        forward.toPos += 100;
                        forward.slide = (forward.slide === nrOfSlides - 1) ? 0 : ++forward.slide;
                        lastDirection = 1;
                    }

                    /* Backward */
                    if (currPos > backward.flipPoint) {
                        if (lastDirection === 1) {
                            backward.slide = forward.slide;
                            backward.toPos = forward.toPos - (nrOfSlides * 100);
                        } else {
                            if (backward.flipPoint === 0) {
                                transform(slider.slides[backward.slide - 1], backward.toPos - 100, '%');
                            }
                            if (currPos < sliderWidth && !firstTime) {
                                backward.flipPoint += sliderWidth / 2;
                                firstTime = true;
                            } else {
                                backward.flipPoint += sliderWidth;
                            }
                        }

                        if (backward.flipPoint !== 0) {
                            forward.flipPoint = backward.flipPoint - sliderWidth;
                            forward.slide = backward.slide;
                            forward.toPos = backward.toPos + nrOfSlides * 100;
                        }

                        transform(slider.slides[backward.slide], backward.toPos, '%');
                        backward.toPos -= 100;
                        backward.slide = (!backward.slide) ? nrOfSlides - 1 : --backward.slide;
                        lastDirection = -1;
                    }
                }

                currentTime += increment;
                currPos = Math.easeOutQuad(currentTime, start, change, o.slideSpeed);
                transform(slideContainer, currPos);
                slider.animationFrame = requestAnimationFrame(animate);
            }
        }
        slider.animationFrame = requestAnimationFrame(animate);
    }



    function startSlideshow() {
        slider.autoTimeOut = setTimeout(next, o.slideInterval);
    }



    function stopSlideshow() {
        cancelAnimationFrame(slider.animationFrame);
        clearTimeout(slider.autoTimeOut);
    }



    function next() {
        move(1);
    }



    function prev() {
        move(-1);
    }



    function setActiveDot(active) {
        if (o.dotActiveClass) {
            removeClass(selectEl(dotWrap, '.' + o.dotActiveClass), o.dotActiveClass);
            addClass(slider.dots[active], o.dotActiveClass);
        }
    }



    function onWidthChange() {
        stopSlideshow();
        sliderWidth = _this.offsetWidth;
        resetSlider(slideIndex % nrOfSlides);

        if (o.slideShow && !o.stopAfterInteraction) {
            startSlideshow();
        }
    }



    function touchEvents(el, callback) {
        /*
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

        /*addEvent(_this, 'touchstart', touchStart);
        addEvent(_this, 'touchmove', touchMove);
        addEvent(_this, 'touchend', touchEnd);

        if (o.mouseDrag) {
            addEvent(_this, 'mousedown', touchStart);
            addEvent(_this, 'mousemove', touchMove);
            addEvent(_this, 'mouseup', touchEnd);
        }*/
    }



    function setup() {
        options && mergeObjects(o, options);

        slideContainer = selectEl(_this, o.containerSelector);
        slider.slides = selectEl(slideContainer, o.slideSelector, true);
        nrOfSlides = slider.slides.length;
        slider.dots = document.createDocumentFragment();
        slideIndex = o.startSlide;
        sliderWidth = _this.offsetWidth;
        offsetCount = 1;    // PROABABLY UNNECESSARY
        prefixedTransform = prefixThis('transform');

        if (nrOfSlides < 2) {
            return;
        }

        /*  
            SPECIAL CASE
            ------------
            If only 2 slides create clones 
            for the carousel effect to work.
            Set TABINDEX to -1 for clones.
        */
        if (!o.rewind && nrOfSlides === 2) {
            slideContainer.appendChild(slider.slides[0].cloneNode(1));
            slideContainer.appendChild(slider.slides[nrOfSlides - 1].cloneNode(1));
            slider.slides = selectEl(slideContainer, o.slideSelector, true);
            nrOfSlides += 2;
        }

        resetSlider(o.startSlide);

        loopSlides(function(i) {
            if (o.dots) {
                var newDot = document.createElement('li');

                (function(dot, nr) {
                    dot.innerHTML = '<span></span>';
                    dot.setAttribute('tabindex', 0);
                    dot.setAttribute('role', 'button');

                    addEvent(dot, 'click', function(e) {
                        setPosition(nr, true);
                        dot.blur();
                    });

                    addEvent(dot, 'touchend', function(e) {
                        setPosition(nr, true);
                    });

                    addEvent(dot, 'keyup', function(e) {    
                        if (e.keyCode === 13) {
                            setPosition(nr, true);
                        }
                    });
                    slider.dots.appendChild(dot);
                })(newDot, i);
            }

            addEvent(this.slides[i], 'focus', function(e) {
                stopSlideshow();
                setPosition(i);
                _this.scrollLeft = 0;
            }, true);
        });

        addEvent(window, 'resize', onWidthChange);
        addEvent(window, 'orientationchange', onWidthChange);

        if (o.dots) {
            dotWrap = document.createElement('ul');
            dotWrap.appendChild(slider.dots);
            _this.appendChild(dotWrap);
            slider.dots = dotWrap.children;
            addClass(dotWrap, o.dotWrapClass);
            addClass(slider.dots[o.startSlide || 0], o.dotActiveClass);
        }

        if (o.mouseDrag) {
            addClass(slideContainer, 'mouse-drag-enabled');
        }

        if (o.slideShow) {
            startSlideshow();
        }
    }



    setup();



    var startPos,
        currentPos,
        currentSlide,
        once = false;
    
    touchEvents(slideContainer, function(e, dir, phase, distance) {
        var newPos,
            direction;

        if ('.' + e.target.parentNode.className === o.dotWrapClass) {
            return;
        }

        if (phase === 'start') {
            if (o.mouseDrag) {
                addClass(slideContainer, 'is-dragging');
            }
            stopSlideshow();
            startPos = getCurrentPosition();
            currentSlide = slideIndex % nrOfSlides;
        }

        if (phase === 'move' && dir === 'left' || dir === 'right') {
            if (!once && !o.rewind) {
                once = true;

                if (!slideIndex || currentSlide === nrOfSlides - 1) {
                    appendClones();
                }

                if (!slideIndex && dir === 'right') {
                    transform(nrOfSlides * sliderWidth * -1 + startPos);
                    startPos = getCurrentPosition();
                    slideIndex = nrOfSlides;
                }
            }
            newPos = startPos + distance;

            if (o.rewind) {
                if (!currentSlide && dir === 'right' || currentSlide === nrOfSlides - 1 && dir === 'left') {
                    newPos = startPos + (distance / 3);
                }
            }
            transform(newPos);
        }

        if (phase === 'end') {
            if (o.mouseDrag) {
                removeClass(slideContainer, 'is-dragging');
            }

            if (Math.abs(distance) > 30) {
                if (dir === 'left') {
                    if (o.rewind && currentSlide === nrOfSlides - 1) {
                        slide(getResetPosition(), -1);
                    } else {
                        next();
                    } 
                } else if (dir === 'right') {
                    if (o.rewind && !currentSlide) {
                        slide(getResetPosition(), 1);
                    } else {
                        prev();
                    }
                }
            } else {
                slide(getResetPosition(), -1);
            }
            once = false;
        }
    });


    return {
        next: next,
        prev: prev,
        stop: stopSlideshow,
        start: startSlideshow,
        resize: onWidthChange
    };
}
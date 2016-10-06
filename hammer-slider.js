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
    *   Slider stops after first slide if 
        stop after interaction is true and
        nothing is touched.

    *   Add flick feature for fast swipes 
        that moves multiple slides.

    *   Slidespeed only takes even numbers of 
        10. If given number is not even, make
        it so.

    *   Rewrite to ES6.

    *   Add Gulp.

    *   Look over code for optimizations.

*/
function HammerSlider(_this, options) {
    'use strict';

    var slider = {},
        slideIndex,
        dotWrap,
        nrOfSlides,
        prefixedTransform,
        circlePoints = {};

    var o = {
        slideShow: false,
        slideInterval: false,
        slideSpeed: 50,
        startSlide: 0,
        stopAfterInteraction: true,
        rewind: false,
        dots: false,
        slideSelector: undefined,
        containerSelector: undefined,
        dotWrapClass: undefined,
        dotActiveClass: undefined,
        mouseDrag: false,
        dragThreshold: 10
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
        el.style[prefixedTransform] = 'translateX(' + value + (unit ? unit : 'px') + ')';
    }



    function loopSlides(callback) {
        for (var i = 0; i < nrOfSlides; i++) {
            callback.call(slider, i);
        }
    }



    function getCurrentPosition() {
        var transform = window.getComputedStyle(slider.container, null).getPropertyValue(prefixedTransform),
            matrixIndex = transform.match('3d') ? 12 : 4;   // 12 is for IE and 4 for other browsers

        return parseInt(transform.split(',')[matrixIndex]);
    }



    function resetSlider(position) {
        var pos = (typeof position !== 'undefined') ? Math.abs(position) : o.startSlide;
        slideIndex = pos;
        slider.width = _this.offsetWidth;

        if (!o.rewind) {
            circlePoints['1'] = {
                slide: (!pos) ? nrOfSlides - 1 : 0,
                flipPoint: (pos === nrOfSlides - 1) ? ((pos - 1) * slider.width * -1) + (slider.width / 2) * -1 : (pos * slider.width * -1) + (slider.width / 2) * -1,
                toPos: (!pos) ? 0 : nrOfSlides * 100
            };

            circlePoints['-1'] = {
                slide: (pos === nrOfSlides - 1) ? 0 : (!pos) ? nrOfSlides - 2 : nrOfSlides - 1,
                flipPoint: (pos * slider.width * -1) + slider.width / 2,
                toPos: (pos === nrOfSlides - 1) ? 0 : nrOfSlides * 100 * -1,
            };
        }

        loopSlides(function(i) {
            var slidePosition;

            if (!o.rewind) {
                if (!i && pos === nrOfSlides - 1) {
                    slidePosition = nrOfSlides * 100;
                } else if (i === nrOfSlides - 1 && !pos) {
                    slidePosition = nrOfSlides * -1 * 100;
                } else {
                    slidePosition = 0;
                }
            } else {
                slidePosition = 0;
            }

            transform(this.slides[i], slidePosition, '%');
            this.slides[i].style.width = slider.width + 'px';
        });

        slider.container.style.width = nrOfSlides * slider.width + 'px';
        transform(slider.container, pos * slider.width * -1);
    }



    function hasReachedCirclePoint(position) {
        var forwardFlip = circlePoints[1].flipPoint,
            backwardFlip = circlePoints[-1].flipPoint;

        // Return direction if flip point for forward or backward has passed
        return (position < forwardFlip) ? 1 : (position > backwardFlip) ? -1 : false;
    }



    function circle(direction) {
        if (!direction) return;

        var opposite = (direction > 0) ? -1 : 1,
            currCircle = circlePoints[direction];

        mergeObjects(circlePoints[opposite], {
            flipPoint: currCircle.flipPoint,
            slide: currCircle.slide,
            toPos: currCircle.toPos + nrOfSlides * 100 * opposite
        });

        transform(slider.slides[currCircle.slide], currCircle.toPos, '%');
        currCircle.flipPoint += slider.width * opposite;

        if (direction === 1) {
            currCircle.slide = (currCircle.slide === nrOfSlides - 1) ? 0 : currCircle.slide + 1;
            if (!currCircle.slide) {
                currCircle.toPos += nrOfSlides * 100; 
            }
        } else {
            currCircle.slide = (!currCircle.slide) ? nrOfSlides - 1 : currCircle.slide - 1;
            if (currCircle.slide === nrOfSlides - 1) {
                currCircle.toPos -= nrOfSlides * 100; 
            }
        }
    }



    function getNextSlideNr(direction) {
        var nextSlide = slideIndex + direction;
        
        if (o.rewind) {
            if (direction === 1) {
                if (nextSlide === nrOfSlides) {
                    return 0;
                }
            } else {
                if (nextSlide < 0) {
                    return nrOfSlides - 1;
                }
            }
        }
        return nextSlide;
    }



    function getActiveSlideNr(pos) {
        var position = pos ? pos : getCurrentPosition(),
            relativeIndex = Math.abs(slideIndex % nrOfSlides),
            activeSlide = (position < 0) ? relativeIndex : nrOfSlides - relativeIndex;

        return (activeSlide > nrOfSlides - 1) ? 0 : activeSlide;
    }



    function setPosition(nextSlide, relative) {
        var next = nextSlide,
            direction = (nextSlide < slideIndex) ? -1 : 1,
            slideDistance;

        stopSlideshow();

        if (relative) {
            var currPos = getCurrentPosition(),
                currIndex = Math.ceil(currPos / slider.width), // Get slideIndex based on slider position when setPosition() is invoked
                offsetCount = Math.ceil(currIndex / nrOfSlides), // Get offset count from base position
                next = Math.abs(offsetCount * nrOfSlides - nextSlide); // Multiply it with nrOfSlides and subtract target slide to get the correct position
            
            if (currPos > 0) next *= -1;
        }

        slideDistance = next * slider.width * -1;
        slideIndex = next;

        if (o.dots) {
            setActiveDot(getActiveSlideNr(slideDistance));
        }

        slide(slideDistance);
    }



    function slide(slideDistance) {
        var currPos = getCurrentPosition(),
            start = currPos,
            change = slideDistance - start,
            currentTime = 0,
            increment = 2;

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
                    circle(hasReachedCirclePoint(currPos));
                }
                currentTime += increment;
                currPos = Math.easeOutQuad(currentTime, start, change, o.slideSpeed);
                transform(slider.container, currPos);
                slider.animationFrame = requestAnimationFrame(animate);
            }
        };
        slider.animationFrame = requestAnimationFrame(animate);
    }



    Math.easeOutQuad = function(t, b, c, d) {
        t /= d;
        return -c * t * (t - 2) + b;
    };



    function startSlideshow() {
        slider.autoTimeOut = setTimeout(next, o.slideInterval);
    }



    function stopSlideshow() {
        cancelAnimationFrame(slider.animationFrame);
        clearTimeout(slider.autoTimeOut);
    }



    function next() {
        setPosition(getNextSlideNr(1));
    }



    function prev() {
        setPosition(getNextSlideNr(-1));
    }



    function setActiveDot(active) {
        if (o.dotActiveClass) {
            removeClass(selectEl(dotWrap, '.' + o.dotActiveClass), o.dotActiveClass);
            addClass(slider.dots[active], o.dotActiveClass);
        }
    }



    function onWidthChange() {
        stopSlideshow();
        resetSlider(slideIndex % nrOfSlides);

        if (o.slideShow && !o.stopAfterInteraction) {
            startSlideshow();
        }
    }



    function touchInit() {
        var startPos,
            currentSlide;

        touchEvents(slider.container, {
            mouse: o.mouseDrag,
            dragThreshold: o.dragThreshold
        }, function(e, direction, phase, distance) {
            var currPos;

            function isDir(dir) {
                return direction === dir;
            }

            if (phase === 'start') {
                stopSlideshow();
                startPos = getCurrentPosition();
                currentSlide = slideIndex % nrOfSlides;

                // Add drag class
                addClass(slider.container, 'is-dragging');
            }

            if (phase === 'move') {
                slider.animationFrame = requestAnimationFrame(function() {
                    if (isDir('left') || isDir('right')) {
                        currPos = startPos + distance;

                        if (!o.rewind) {
                            circle(hasReachedCirclePoint(currPos));
                        } else if (!currentSlide && isDir('right') || currentSlide === nrOfSlides - 1 && isDir('left')) {
                            currPos = startPos + (distance / 2.5);
                        }
                        transform(slider.container, currPos);
                    }
                });
            }

            if (phase === 'end') {
                if (Math.abs(distance) > 30) {
                    if (isDir('left')) {
                        (o.rewind && currentSlide === nrOfSlides - 1) ? setPosition(nrOfSlides - 1) : next();
                    } else if (isDir('right')) {
                        (o.rewind && !currentSlide) ? setPosition(0) : prev();
                    }
                } else {
                    setPosition(slideIndex);
                }

                // Remove drag class
                removeClass(slider.container, 'is-dragging');
            }
        });
    }



    function setup() {
        // Merge user options into defaults
        options && mergeObjects(o, options);

        slider.container = selectEl(_this, o.containerSelector);
        slider.slides = selectEl(slider.container, o.slideSelector, true);
        nrOfSlides = slider.slides.length;
        slider.dots = document.createDocumentFragment();
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
            slider.container.appendChild(slider.slides[0].cloneNode(1));
            slider.container.appendChild(slider.slides[nrOfSlides - 1].cloneNode(1));
            slider.slides = selectEl(slider.container, o.slideSelector, true);
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
                setPosition(i, true);
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
            addClass(slider.container, 'mouse-drag-enabled');
        }

        if (o.slideShow) {
            startSlideshow();
        }

        touchInit();
    }



    setup();



    return {
        next: next,
        prev: prev,
        stop: stopSlideshow,
        start: startSlideshow,
        resize: onWidthChange,
        activeSlideNr: getActiveSlideNr
    };
}
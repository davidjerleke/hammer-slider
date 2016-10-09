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
    *   Add flick feature for fast swipes 
        that moves multiple slides.

    *   Slidespeed only takes even numbers of 
        10. If given number is not even, make
        it so. Math.ceil(o.slideSpeed / 10) * 10

    *   Rewrite to ES6.

    *   Add Gulp.

    *   Look over code for optimizations.

*/
function HammerSlider(_this, options) {
    'use strict';

    var slider = {
            slides: [],
            dots: []
        },
        circlePoints = {},
        slideIndex = 0,
        nrOfSlides,
        prefixedTransform,
        h = {}; // Helpers

    var o = {
        slideShow: false,
        slideInterval: false,
        slideSpeed: 50,
        startSlide: 0,
        stopAfterInteraction: true,
        rewind: false,
        dots: false,
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
        el && el.addEventListener(event, func, !!bool);
    }



    function addClass(el, className) {
        el && el.classList.add(className);
    }


    function removeClass(el, className) {
        el && el.classList.remove(className);
    }



    function getSupport(property) {
        var prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'],
            div = document.createElement('div');

        for (var i in prefixes) {
            if (typeof div.style[prefixes[i] + property] !== 'undefined') {
                return prefixes[i] + property;
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
                slide: (!pos) ? h.lastSlide : 0,
                flipPoint: (h.isLastSlide(pos)) ? ((pos - 1) * slider.width * -1) + (slider.width / 2) * -1 : (pos * slider.width * -1) + (slider.width / 2) * -1,
                toPos: (!pos) ? 0 : h.nrSlidesInPercent
            };

            circlePoints['-1'] = {
                slide: (h.isLastSlide(pos)) ? 0 : (!pos) ? h.lastSlide - 1 : h.lastSlide,
                flipPoint: (pos * slider.width * -1) + slider.width / 2,
                toPos: (h.isLastSlide(pos)) ? 0 : h.nrSlidesInPercent * -1
            };
        }

        loopSlides(function(i) {
            var slidePosition = 0;

            if (!o.rewind) {
                if (!i && h.isLastSlide(pos)) {
                    slidePosition = h.nrSlidesInPercent;
                } else if (h.isLastSlide(i) && !pos) {
                    slidePosition = h.nrSlidesInPercent * -1;
                }
            }
            transform(this.slides[i], slidePosition, '%');
            this.slides[i].style.width = this.width + 'px';
        });

        slider.container.style.width = nrOfSlides * slider.width + 'px';
        transform(slider.container, pos * slider.width * -1);

        if (o.dots) {
            setActiveDot(pos);
        }
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
            toPos: currCircle.toPos + h.nrSlidesInPercent * opposite
        });

        transform(slider.slides[currCircle.slide], currCircle.toPos, '%');
        currCircle.flipPoint += slider.width * opposite;

        if (direction === 1) {
            currCircle.slide = (h.isLastSlide(currCircle.slide)) ? 0 : currCircle.slide + 1;
            if (!currCircle.slide) {
                currCircle.toPos += h.nrSlidesInPercent;
            }
        } else {
            currCircle.slide = (!currCircle.slide) ? h.lastSlide : currCircle.slide - 1;
            if (h.isLastSlide(currCircle.slide)) {
                currCircle.toPos -= h.nrSlidesInPercent;
            }
        }
    }



    function getNextSlide(direction) {
        var nextSlide = slideIndex + direction;
        
        if (o.rewind) {
            if (direction === 1) {
                if (nextSlide === nrOfSlides) {
                    return 0;
                }
            } else {
                if (nextSlide < 0) {
                    return h.lastSlide;
                }
            }
        }
        return nextSlide;
    }



    function getRelativeSlide(slideNr) {
        var currPos = getCurrentPosition(),
            currIndex = Math.ceil(currPos / slider.width), // Get slideIndex based on slider position when setPosition() is invoked
            offsetCount = Math.ceil(currIndex / nrOfSlides), // Get offset count from base position
            next = Math.abs(offsetCount * nrOfSlides - slideNr); // Multiply it with nrOfSlides and subtract target slide to get the correct position
            
         return (currPos > 0) ? next * -1 : next;
    }



    function getActiveSlideNr(pos) {
        var relativeIndex = Math.abs(slideIndex % nrOfSlides),
            activeSlide = ((pos || getCurrentPosition()) < 0) ? relativeIndex : nrOfSlides - relativeIndex;

        return (activeSlide > h.lastSlide) ? 0 : activeSlide;
    }



    function setPosition(nextSlide, relative, autoSliding) {
        var next = (relative) ? getRelativeSlide(nextSlide) : nextSlide,
            slideDistance = next * slider.width * -1;

        stopSlideshow();
        slideIndex = next;

        if (o.dots) {
            setActiveDot(getActiveSlideNr(slideDistance));
        }
        slide(slideDistance, autoSliding);
    }



    function slide(slideDistance, autoSliding) {
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
                shouldResumeSlideshow(autoSliding);
            } else {
                if (!o.rewind) {
                    circle(hasReachedCirclePoint(currPos));
                }
                currentTime += increment;
                currPos = parseInt(Math.easeOutQuad(currentTime, start, change, o.slideSpeed));
                transform(slider.container, currPos);
                slider.animationFrame = requestAnimationFrame(animate);
            }
        };
        slider.animationFrame = requestAnimationFrame(animate);
    }



    Math.easeOutQuad = function(t, b, c, d) {
        t /= d;
        return -c * t * (t - 2) + b;
    }



    function startSlideshow() {
        slider.autoTimeOut = setTimeout(function() {
            setPosition(getNextSlide(1), false, true);
        }, o.slideInterval);
    }



    function stopSlideshow() {
        cancelAnimationFrame(slider.animationFrame);
        clearTimeout(slider.autoTimeOut);
    }



    function shouldResumeSlideshow(autoSliding) {
        if (o.slideShow) {
            if (!o.stopAfterInteraction || autoSliding) {
                startSlideshow();
            }
        }
    }



    function next() {
        setPosition(getNextSlide(1));
    }



    function prev() {
        setPosition(getNextSlide(-1));
    }



    function setActiveDot(active) {
        if (o.dotActiveClass) {
            removeClass(selectEl(slider.dotWrap, '.' + o.dotActiveClass), o.dotActiveClass);
            addClass(slider.dots[active], o.dotActiveClass);
        }
    }



    function onWidthChange() {
        stopSlideshow();
        resetSlider(getActiveSlideNr());
        shouldResumeSlideshow();
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
                return dir === direction;
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
                        } else if (!currentSlide && isDir('right') || h.isLastSlide(currentSlide) && isDir('left')) {
                            currPos = startPos + (distance / 2.5);
                        }
                        transform(slider.container, currPos);
                    }
                });
            }

            if (phase === 'end') {
                if (Math.abs(distance) > 30) {
                    if (isDir('left')) {
                        (o.rewind && h.isLastSlide(currentSlide)) ? setPosition(h.lastSlide) : next();
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
        var dotFrag = document.createDocumentFragment();
        slider.container = selectEl(_this, o.containerSelector);
        nrOfSlides = slider.container.children.length;
        prefixedTransform = getSupport('transform');

        if (nrOfSlides < 2 || !prefixedTransform) {
            return;
        }

        /*  
            SPECIAL CASE
            ------------
            If only 2 slides create clones 
            for the carousel effect to work.
            Set TABINDEX to -1 for clones.
        */
        /*
        if (!o.rewind && nrOfSlides === 2) {
            slider.container.appendChild(slider.slides[0].cloneNode(1));
            slider.container.appendChild(slider.slides[nrOfSlides - 1].cloneNode(1));
            nrOfSlides += 2;
        }
        */


        // Helpers ( MOVE TO A SEPARATE FUNCTION )
        h.nrSlidesInPercent = nrOfSlides * 100;
        h.lastSlide = nrOfSlides - 1;
        h.isLastSlide = function(nr) {
            return nr === h.lastSlide;
        }


        loopSlides(function(i) {
            this.slides.push(this.container.children[i]);

            if (o.dots && nrOfSlides > 1) {
                var newDot = document.createElement('li');

                (function(dot, nr) {

                    // Make dots tabbable with "tabindex"
                    dot.setAttribute('tabindex', 0);
                    dot.setAttribute('role', 'button');
                    
                    dot.innerHTML = '<span></span>';

                    // Remove outlines from dots when clicked
                    addEvent(dot, 'click', function(e) {
                        setPosition(nr, true);
                        dot.blur();
                    });

                    // Don't remove outlines when tabbing and Enter
                    // key is used to navigate with dots.
                    addEvent(dot, 'keyup', function(e) {    
                        if (e.keyCode === 13) {
                            setPosition(nr, true);
                        }
                    });

                    dotFrag.appendChild(dot);
                })(newDot, i);

                this.dots.push(newDot);

                // Add dots to slider
                if (h.isLastSlide(i)) {
                    this.dotWrap = document.createElement('ul');
                    this.dotWrap.appendChild(dotFrag);
                    _this.appendChild(this.dotWrap);
                    addClass(this.dotWrap, o.dotWrapClass);
                }
            }

            // Prevent slider from breaking when tabbing during slide
            // transition which alters scrollLeft. Set scrollLeft to
            // 0 and slide to focused slide instead.
            addEvent(this.slides[i], 'focus', function(e) {
                stopSlideshow();
                _this.scrollLeft = 0;
                setPosition(i, true);
            }, true);
        });

        // Listen for window resize events
        addEvent(window, 'resize', onWidthChange);
        addEvent(window, 'orientationchange', onWidthChange);

        resetSlider();
        touchInit();

        if (o.mouseDrag) {
            addClass(slider.container, 'mouse-drag-enabled');
        }

        if (o.slideShow) {
            startSlideshow();
        }
    }


    // Merge user options into defaults
    options && mergeObjects(o, options);

    // Init
    setup();

    // Expose slider API
    return {
        goTo: function(slideNr) {
            setPosition(slideNr, true);
        },
        reset: function(slideNr) {
            resetSlider(slideNr);
        },
        next: next,
        prev: prev,
        stop: stopSlideshow,
        start: startSlideshow,
        activeSlideNr: getActiveSlideNr
    };
}
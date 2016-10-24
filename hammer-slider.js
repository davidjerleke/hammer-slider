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
    *   Fix clone issue of dots when
        there's only two slides.

    *   Rewrite to ES6.

    *   Add Gulp.

    *   Look over code for optimizations.

*/
function HammerSlider(_this, options) {
    'use strict';

    // Main declarations
    var slider = {
            slides: [],
            dots: []
        },
        circlePoints = {},
        slideIndex = 0,
        nrOfSlides,
        prefixedTransform,
        helper;

    // Default options
    var o = {
        slideShow: false,
        slideInterval: false,
        slideSpeed: 50,
        touchSpeed: 50,
        startSlide: 0,
        dragThreshold: 10,
        minimumDragDistance: 30,
        stopAfterInteraction: true,
        rewind: false,
        dots: false,
        mouseDrag: false,
        dotContainer: undefined,
        slideContainer: undefined,
        beforeSlideChange: undefined,
        afterSlideChange: undefined,
        onSetup: undefined,
        cssPrefix: 'c-slider'
    };

    // Merge user options into defaults
    options && mergeObjects(o, options);

    var classes = {
        dotWrap: o.cssPrefix + '__dots',
        dotItem: o.cssPrefix + '__dot',
        dotActiveClass: o.cssPrefix + '__dot--is-active',
        dragging: o.cssPrefix + '__container--is-dragging',
        mouseDrag: o.cssPrefix + '__container--mouse-drag-enabled'
    };



    function mergeObjects(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
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



    function forEachSlide(callback) {
        // Pass slider object as context for "this" in loop since looping
        // slides will involve making changes to slider elements of some sort.
        for (var i = 0; i < nrOfSlides; i++) {
            callback.call(slider, i);
        }
    }



    function getCurrentPosition() {
        var transform = window.getComputedStyle(slider.container, null).getPropertyValue(prefixedTransform);
        // matrixIndex = transform.match('3d') ? 12 : 4; // Should be used for translate 3D
        return parseInt(transform.split(',')[4]);
    }



    function makeHelpers() {
        return {
            nrSlidesInPercent: nrOfSlides * 100,
            lastSlide: nrOfSlides - 1,
            isLastSlide: function(nr) {
                return nr === this.lastSlide;
            }
        };
    }



    function resetSlider(position) {
        var pos = (typeof position !== 'undefined') ? Math.abs(position) : o.startSlide;
        slideIndex = pos;
        slider.width = _this.offsetWidth;

        if (!o.rewind) {
            // Circle points will be the breakpoints for slide flipping used to make
            // an infinite carousel effect. Flip points will always be set halfway 
            // through a slide transition to get rid of flicking when slide speed is 
            // not fast enough to hide it.
            circlePoints['1'] = {
                slide: (!pos) ? helper.lastSlide : 0,
                flipPoint: (helper.isLastSlide(pos) ? pos - 1 : pos) * slider.width * -1 + slider.width * -0.5,
                toPos: (!pos) ? 0 : helper.nrSlidesInPercent
            };

            circlePoints['-1'] = {
                slide: helper.isLastSlide(pos) ? 0 : !pos ? helper.lastSlide - 1 : helper.lastSlide,
                flipPoint: (pos * slider.width * -1) + slider.width / 2,
                toPos: helper.isLastSlide(pos) ? 0 : helper.nrSlidesInPercent * -1
            };
        }

        forEachSlide(function(i) {
            var slidePosition = 0;

            if (!o.rewind) {
                // Position slides so there's always one slide before current
                // and one after for the infinite sliding effect.
                if (!i && helper.isLastSlide(pos)) {
                    slidePosition = helper.nrSlidesInPercent;
                } else if (helper.isLastSlide(i) && !pos) {
                    slidePosition = helper.nrSlidesInPercent * -1;
                }
            }
            transform(this.slides[i], slidePosition, '%');
            this.slides[i].style.width = this.width + 'px';
        });

        // Set container width to fit floated slides
        slider.container.style.width = nrOfSlides * slider.width + 'px';
        // Set slider position to start slide
        transform(slider.container, pos * slider.width * -1);
        setActiveDot(pos);
    }



    function hasReachedCirclePoint(position) {
        var forwardFlip = circlePoints[1].flipPoint,
            backwardFlip = circlePoints[-1].flipPoint;

        // Return direction if forward or backward flip point has passed
        return (position < forwardFlip) ? 1 : (position > backwardFlip) ? -1 : false;
    }



    function circle(direction) {
        if (!direction) return;

        var opposite = (direction > 0) ? -1 : 1,
            currCircle = circlePoints[direction];

        transform(slider.slides[currCircle.slide], currCircle.toPos, '%');
        mergeObjects(circlePoints[opposite], {
            flipPoint: currCircle.flipPoint,
            slide: currCircle.slide,
            toPos: currCircle.toPos + helper.nrSlidesInPercent * opposite
        });
        currCircle.flipPoint += slider.width * opposite;
        
        if (updateCircleSlide(currCircle, direction)) {
            currCircle.toPos += helper.nrSlidesInPercent * direction;
        }
    }



    function updateCircleSlide(obj, direction) {
        if (direction === 1) {
            obj.slide = (helper.isLastSlide(obj.slide)) ? 0 : obj.slide + 1;
            return !obj.slide;
        } else {
            obj.slide = (!obj.slide) ? helper.lastSlide : obj.slide - 1;
            return helper.isLastSlide(obj.slide);
        }
    }



    function getNextSlide(direction) {
        // Change direction if rewind is true and it's the first
        // slide moving backward or last slide moving forward.
        if (o.rewind) {
            if (direction === 1) {
                if (helper.isLastSlide(slideIndex)) {
                    return 0;
                }
            } else {
                if (!slideIndex) {
                    return helper.lastSlide;
                }
            }
        }

        return slideIndex + direction;
    }



    function getRelativeSlide(slideNr) {
        // To get next slide number relative to current position the offset from
        // base position needs to be calculated, since flipping slides causes offsets
        // when infinite carousel effect is used.
        var currPos = getCurrentPosition(),
            currIndex = Math.ceil(currPos / slider.width),
            offsetCount = Math.ceil(currIndex / nrOfSlides),
            next = Math.abs(offsetCount * nrOfSlides - slideNr);
            
         return (currPos > 0) ? next * -1 : next;
    }



    function getActiveSlideNr(pos) {
        // Active slide number can be fetched either in advance by providing 
        // target distance as parameter or based on current actual position.
        var relativeIndex = Math.abs(slideIndex % nrOfSlides),
            activeSlide = ((pos || getCurrentPosition()) < 0) ? relativeIndex : nrOfSlides - relativeIndex;

        return (activeSlide > helper.lastSlide) ? 0 : activeSlide;
    }



    function setPosition(nextSlide, relative, speed, autoSlide) {
        var next = (relative) ? getRelativeSlide(nextSlide) : nextSlide,
            slideDistance = next * slider.width * -1,
            activeSlide;

        // Stop slideshow whenever interaction  
        // has occured before taking action.
        stopSlideshow();
        slideIndex = next;
        activeSlide = getActiveSlideNr(slideDistance);

        // API Callback
        o.beforeSlideChange && o.beforeSlideChange(activeSlide);

        setActiveDot(activeSlide);
        slide(slideDistance, speed, autoSlide);
    }



    function slide(slideDistance, speed, autoSlide) {
        var slideSpeed = speed || o.slideSpeed,
            currPos = getCurrentPosition(),
            start = currPos,
            change = slideDistance - start,
            currentTime = 0,
            increment = 2;

        function animate() {
            if (currentTime === slideSpeed) {
                if (slideIndex % nrOfSlides === o.startSlide) {
                    resetSlider();
                }
                shouldResumeSlideshow(autoSlide);

                // API Callback
                o.afterSlideChange && o.afterSlideChange(getActiveSlideNr());
            } else {
                if (!o.rewind) {
                    circle(hasReachedCirclePoint(currPos));
                }
                currentTime += increment;
                currPos = parseInt(Math.easeOutQuad(currentTime, start, change, slideSpeed));
                transform(slider.container, currPos);

                // Recursively call RAF until slide distance is met
                slider.animationFrame = requestAnimationFrame(animate);
            }
        };
        // Init RAF recursion
        slider.animationFrame = requestAnimationFrame(animate);
    }



    Math.easeOutQuad = function(t, b, c, d) {
        t /= d;
        return -c * t * (t - 2) + b;
    }



    function startSlideshow() {
        slider.autoTimeOut = setTimeout(function() {
            setPosition(getNextSlide(1), false, false, true);
        }, o.slideInterval);
    }



    function stopSlideshow() {
        cancelAnimationFrame(slider.animationFrame);
        clearTimeout(slider.autoTimeOut);
    }



    function shouldResumeSlideshow(autoSlide) {
        if (o.slideShow && !o.stopAfterInteraction || autoSlide) {
            startSlideshow();
        }
    }



    function next() {
        setPosition(getNextSlide(1));
    }



    function prev() {
        setPosition(getNextSlide(-1));
    }



    function setActiveDot(active) {
        if (o.dots && classes.dotActiveClass) {
            removeClass(slider.dotWrap.querySelector('.' + classes.dotActiveClass), classes.dotActiveClass);
            addClass(slider.dots[active], classes.dotActiveClass);
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
        }, function(e, direction, phase, diff) {
            var currPos;

            function isDir(dir) {
                return dir === direction;
            }

            if (phase === 'start') {
                stopSlideshow();
                startPos = getCurrentPosition();
                currentSlide = slideIndex % nrOfSlides;

                // Add drag class
                addClass(slider.container, classes.dragging);
            }

            if (phase === 'move' && (isDir('left') || isDir('right'))) {
                slider.animationFrame = requestAnimationFrame(function() {
                    // Calculate changed position
                    currPos = startPos + diff.X;

                    if (!o.rewind) {
                        circle(hasReachedCirclePoint(currPos));
                    } else if (!currentSlide && isDir('right') || helper.isLastSlide(currentSlide) && isDir('left')) {
                        // Resist dragging if it's first slide 
                        // or last and if rewind is true
                        currPos = startPos + (diff.X / 2.5);
                    }
                    transform(slider.container, currPos);
                });
            }

            if (phase === 'end') {
                var targetSlide = slideIndex;

                // Only set new target slide if drag exceeds minimum drag distance
                if (Math.abs(diff.X) > o.minimumDragDistance) {
                    if (isDir('left')) {
                        targetSlide = (o.rewind && helper.isLastSlide(currentSlide)) ? helper.lastSlide : getNextSlide(1);
                    } else if (isDir('right')) {
                        targetSlide = (o.rewind && !currentSlide) ? 0 : getNextSlide(-1);
                    }
                }
                setPosition(targetSlide, false, o.touchSpeed);

                // Remove drag class
                removeClass(slider.container, classes.dragging);
            }
        });
    }



    function setup() {
        var dotFrag = document.createDocumentFragment();
        slider.container = o.slideContainer || _this.children[0];
        nrOfSlides = slider.container.children.length;
        prefixedTransform = getSupport('transform');

        // Only set widths if one slide is provided
        // Remove hardware acceleration if transform is supported
        if (nrOfSlides <= 1 || !prefixedTransform) {
            forEachSlide(function(i) {
                this.container.children[i].style.width = '100%';
                this.container.style.width = nrOfSlides * 100 + '%';
            });
            prefixedTransform && transform(slider.container, 0);
            return;
        }

        /*  
            SPECIAL CASE
            ------------
            If only 2 slides create clones 
            for the carousel effect to work.
        */
        if (!o.rewind && nrOfSlides === 2) {
            var container = slider.container;
            container.appendChild(container.children[0].cloneNode(1));
            container.appendChild(container.children[nrOfSlides - 1].cloneNode(1));
            nrOfSlides += 2;
        }

        // Make utilities
        helper = makeHelpers();
        o.slideSpeed = (o.slideSpeed < 2) ? 2 : Math.ceil(o.slideSpeed / 10) * 10;

        forEachSlide(function(i) {
            // Cache slides
            this.slides.push(this.container.children[i]);

            // Prevent slider from breaking when tabbing during slide
            // transition which alters scrollLeft. Set scrollLeft to
            // 0 and slide to focused slide instead.
            addEvent(this.slides[i], 'focus', function(e) {
                stopSlideshow();
                _this.scrollLeft = 0;
                setPosition(i, true);
            }, true);

            if (o.dots) {
                var newDot = document.createElement('li');

                (function(dot, nr) {
                    // Make dots tabbable with "tabindex"
                    addClass(dot, classes.dotItem);
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

                // Cache dots
                this.dots.push(newDot);

                // Add dots to slider or given dotContainer element
                if (helper.isLastSlide(i)) {
                    this.dotWrap = o.dotContainer || document.createElement('ul');
                    this.dotWrap.appendChild(dotFrag);
                    
                    if (!o.dotContainer) {
                        addClass(this.dotWrap, classes.dotWrap);
                        _this.appendChild(this.dotWrap);
                    }
                }
            }
        });

        // Listen for window resize events
        addEvent(window, 'resize', onWidthChange);
        addEvent(window, 'orientationchange', onWidthChange);

        resetSlider();
        touchInit();

        o.mouseDrag && addClass(slider.container, classes.mouseDrag);
        o.slideShow && startSlideshow();

        // API Callback after setup, 
        // expose API first using timeout
        setTimeout(function() {
            o.onSetup && o.onSetup(nrOfSlides);
        }, 0);
    }

    // Init
    setup();

    // Expose slider API
    return {
        goTo: function(slideNr, speed) {
            setPosition(slideNr, true, speed);
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
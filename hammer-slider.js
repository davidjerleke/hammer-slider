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

    *   When rewind is true, make sure resisting
        don't start before user swipes less than 0 or
        more than slideContainer width. This should
        not be dependent on slideIndex like it is now.

    *   Fix the dots to work when rewind is false,
        when slider is a carousel.

    *   Rewrite to ES6.

    *   Add Gulp.

    *   Look over code for optimizations.

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
        flipPoints = {},
        lastDirection;

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



    function resetSlider(position) {
        var pos = (typeof position !== 'undefined') ? Math.abs(position) : o.startSlide;
        slideIndex = pos;

        if (!o.rewind) {
            flipPoints['1'] = {
                slide: 0,
                flipPoint: (pos > 0 && pos <= nrOfSlides - 2) ? ((pos * sliderWidth * 2) - (sliderWidth / 2)) * -1 : ((sliderWidth * (nrOfSlides - 2)) + (sliderWidth / 2)) * -1,
                toPos: nrOfSlides * 100,
            };
            flipPoints['-1'] = {
                slide: nrOfSlides - 1,
                flipPoint: (pos > 0 && pos <= nrOfSlides - 2) ? sliderWidth / 2 * -1 : 0,
                toPos: nrOfSlides * 100 * -1,
            };
        }

        loopSlides(function(i) {
            transform(this.slides[i], 0);
            this.slides[i].style.width = sliderWidth + 'px';
        });

        slideContainer.style.width = nrOfSlides * sliderWidth + 'px';
        transform(slideContainer, pos * sliderWidth * -1);
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



    function circle(callback) {
        callback.call(slider, flipPoints[1], flipPoints[-1]);
    }



    function circleForward() {
        circle(function(forward, backward) {
            backward.flipPoint = forward.flipPoint;
            transform(this.slides[forward.slide], forward.toPos, '%');
            forward.flipPoint -= sliderWidth;
            forward.slide = (forward.slide === nrOfSlides - 1) ? 0 : ++forward.slide;

            if (!forward.slide) {
                forward.toPos += nrOfSlides * 100; 
            }
            lastDirection = 1;
        });
    }



    function circleBackward() {
        circle(function(forward, backward) {
            if (lastDirection === 1) {
                backward.slide = forward.slide;
                backward.toPos = forward.toPos - (nrOfSlides * 100);
            } else {
                backward.flipPoint += (backward.flipPoint === 0) ? sliderWidth / 2 : sliderWidth;
            }

            forward.flipPoint = backward.flipPoint - sliderWidth;
            forward.slide = backward.slide;
            forward.toPos = backward.toPos + nrOfSlides * 100;

            transform(this.slides[backward.slide], backward.toPos, '%');
            backward.slide = (!backward.slide) ? nrOfSlides - 1 : --backward.slide;

            if (backward.slide === nrOfSlides - 1) {
                backward.toPos -= nrOfSlides * 100; 
            }
            lastDirection = -1;
        });
    }



    function slide(slideDistance, direction) {
        var forward = flipPoints[1],
            backward = flipPoints[-1],
            currPos = getCurrentPosition(),
            currentTime = 0,
            start = currPos,
            change = slideDistance - start,
            increment = 20;

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
                    /* Forward */
                    if (currPos < forward.flipPoint) {
                        circleForward();
                    }

                    /* Backward */
                    if (currPos > backward.flipPoint) {
                        circleBackward();
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



    Math.easeOutQuad = function(t, b, c, d) {
        t /= d;
        return -c * t*(t-2) + b;
    };



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



    function touch() {
        var startPos,
            currentSlide;

        touchEvents(slideContainer, {
            mouse: o.mouseDrag
        }, function(e, direction, phase, distance, swipeType) {
            var newPos,
                forward = flipPoints[1],
                backward = flipPoints[-1];

            if (phase === 'start') {
                if (o.mouseDrag) {
                    addClass(slideContainer, 'is-dragging');
                }
                stopSlideshow();
                startPos = getCurrentPosition();
                currentSlide = slideIndex % nrOfSlides;
            }

            if (phase === 'move' && direction === 'left' || direction === 'right') {
                newPos = getCurrentPosition();

                if (!o.rewind) {
                    /* Forward */
                    if (direction === 'left' && newPos < forward.flipPoint) {
                        circleForward();
                    }

                    /* Backward */
                    if (direction === 'right' && newPos > backward.flipPoint) {
                        circleBackward();
                    }
                }

                newPos = startPos + distance;
                if (o.rewind) {
                    if (!currentSlide && direction === 'right' || currentSlide === nrOfSlides - 1 && direction === 'left') {
                        newPos = startPos + (distance / 3);
                    }
                }
                slider.animationFrame = requestAnimationFrame(function() {
                    transform(slideContainer, newPos);
                });
            }

            if (phase === 'end') {
                if (o.mouseDrag) {
                    removeClass(slideContainer, 'is-dragging');
                }

                if (Math.abs(distance) > 30) {
                    if (direction === 'left') {
                        /* REWRITE TO TERNARY */
                        if (o.rewind && currentSlide === nrOfSlides - 1) {
                            setPosition(nrOfSlides - 1);
                        } else {
                            next();
                        } 
                    } else if (direction === 'right') {
                        /* REWRITE TO TERNARY */
                        if (o.rewind && !currentSlide) {
                            setPosition(0);
                        } else {
                            prev();
                        }
                    }
                } else {
                    setPosition(slideIndex, -1);
                }
            }
        });
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

        touch();
    }



    setup();



    return {
        next: next,
        prev: prev,
        stop: stopSlideshow,
        start: startSlideshow,
        resize: onWidthChange
    };
}
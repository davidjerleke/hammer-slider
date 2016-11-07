/*
  - Publish to NPM
  - Upload to github
  - Correct all git links in: 
      - Comments above
      - package.json
      - CodePen demo
      - README.MD
*/

function HammerSlider(_this, options) {
  'use strict';

  // Main declarations
  let slider = {
      slides: [],
      dots: []
    },
    flipPoints = {},
    slideIndex = 0,
    nrOfSlides = 0,
    nrOfClones = 0,
    prefixedTransform,
    helper;


  // Default options
  const o = {
    slideShow: false,
    slideInterval: 5000,
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


  const classes = {
    dotWrap: `${o.cssPrefix}__dots`,
    dotItem: `${o.cssPrefix}__dot`,
    dotActiveClass: `${o.cssPrefix}__dot--is-active`,
    dragging: `${o.cssPrefix}__container--is-dragging`,
    mouseDrag: `${o.cssPrefix}__container--mouse-drag-enabled`
  };


  function mergeObjects(target, source) {
    for (let key in source) {
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
    const prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'],
      div = document.createElement('div');

    for (let i in prefixes) {
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
    for (let i = 0; i < nrOfSlides; i++) {
      callback.call(slider, i);
    }
  }


  function getCurrentPosition() {
    // Gets current translateX value for slider container.
    const transform = window.getComputedStyle(slider.container, null).getPropertyValue(prefixedTransform);
    return parseInt(transform.split(',')[4]);
  }


  function makeHelpers() {
    return {
      relativeSlideFunc: nrOfClones ? getRelativeClone : getRelativeSlide,
      nrSlidesInPercent: nrOfSlides * 100,
      lastSlide: nrOfSlides - 1,
      isLastSlide: function(nr) {
        return nr === this.lastSlide;
      }
    };
  }


  function setupSlider(startSlide) {
    const pos = startSlide ? Math.abs(startSlide) : o.startSlide;
    slideIndex = pos;
    slider.width = _this.offsetWidth;

    if (!o.rewind) {
      // Flip points will be the breakpoints for slide flipping used to make
      // an infinite carousel effect. Flip points will always be set halfway 
      // through a slide transition to get rid of flicking when slide speed is 
      // not fast enough to hide it. 1 is forward and -1 is backward.
      flipPoints['1'] = {
        slide: !pos ? helper.lastSlide : 0,
        flipPoint: (helper.isLastSlide(pos) ? pos - 1 : pos) * slider.width * -1 + slider.width * -0.5,
        toPos: !pos ? 0 : helper.nrSlidesInPercent
      };

      flipPoints['-1'] = {
        slide: helper.isLastSlide(pos) ? 0 : !pos ? helper.lastSlide - 1 : helper.lastSlide,
        flipPoint: pos * slider.width * -1 + slider.width * 0.5,
        toPos: helper.isLastSlide(pos) ? 0 : helper.nrSlidesInPercent * -1
      };
    }

    forEachSlide(function(i) {
      let slidePosition = 0;

      if (!o.rewind) {
        // Position slides so there's always one slide before current
        // and one after for the infinite carousel effect.
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


  function hasReachedFlipPoint(position) {
    const forwardFlip = flipPoints[1].flipPoint,
      backwardFlip = flipPoints[-1].flipPoint;
    // Return direction if forward or backward flip point has passed
    return position < forwardFlip ? 1 : position > backwardFlip ? -1 : false;
  }


  function flip(direction) {
    if (!direction) return;

    const opposite = direction > 0 ? -1 : 1,
      currFlip = flipPoints[direction];

    transform(slider.slides[currFlip.slide], currFlip.toPos, '%');
    mergeObjects(flipPoints[opposite], {
      flipPoint: currFlip.flipPoint,
      slide: currFlip.slide,
      toPos: currFlip.toPos + helper.nrSlidesInPercent * opposite
    });
    currFlip.flipPoint += slider.width * opposite;
    
    if (updateFlipSlide(currFlip, direction)) {
      currFlip.toPos += helper.nrSlidesInPercent * direction;
    }
  }


  function updateFlipSlide(obj, direction) {
    switch (direction) {
      case 1:
        obj.slide = helper.isLastSlide(obj.slide) ? 0 : ++obj.slide;
        return !obj.slide;
      case -1:
        obj.slide = !obj.slide ? helper.lastSlide : --obj.slide;
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
    // Default: move to given direction
    return slideIndex + direction;
  }


  function getRelativeSlide(slideNr) {
    // To get next slide number relative to current position the offset from
    // base position needs to be calculated, since flipping slides causes
    // offsets for slideIndex when the infinite carousel effect is used.
    const currPos = getCurrentPosition(),
      currIndex = Math.ceil(currPos / slider.width),
      offsetCount = Math.ceil(currIndex / nrOfSlides),
      next = Math.abs(offsetCount * nrOfSlides - slideNr);
        
    return currPos > 0 ? next * -1 : next;
  }


  function getRelativeClone(slideNr) {
    const currPos = getCurrentPosition() / slider.width,
      currIndex = (currPos < 0) ? Math.ceil(Math.abs(currPos)) : Math.floor(currPos * -1),
      isEven = !(Math.abs(currIndex % nrOfSlides) % 2),
      next = isEven && slideNr ? 1 : !isEven && !slideNr ? -1 : 0;

    return currIndex + next;
  }


  function getActiveSlideNr(pos) {
    // Active slide number can be fetched either in advance by providing 
    // target distance as parameter or based on current actual position.
    const relativeIndex = Math.abs(slideIndex % nrOfSlides),
      activeSlide = ((pos || getCurrentPosition()) < 0) ? relativeIndex : nrOfSlides - relativeIndex;

    return activeSlide > helper.lastSlide ? 0 : activeSlide;
  }


  function setPosition(nextSlide, relative, speed, autoSlide) {
    let next = relative ? helper.relativeSlideFunc(nextSlide) : nextSlide,
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
    let slideSpeed = speed || o.slideSpeed,
      currPos = getCurrentPosition(),
      start = currPos,
      change = slideDistance - start,
      currentTime = 0,
      increment = 2;

    function animate() {
      if (currentTime === slideSpeed) {
        if (slideIndex % nrOfSlides === o.startSlide) {
          setupSlider();
        }
        // API Callback
        o.afterSlideChange && o.afterSlideChange(getActiveSlideNr());
        shouldResumeSlideshow(autoSlide);
      } else {
        !o.rewind && flip(hasReachedFlipPoint(currPos));
        currentTime += increment;
        currPos = parseInt(Math.easeOutQuad(currentTime, start, change, slideSpeed));
        transform(slider.container, currPos);
        // Recursively call RAF until slide distance is met
        slider.animationFrame = requestAnimationFrame(animate);
      }
    }
    // Init RAF recursion
    slider.animationFrame = requestAnimationFrame(animate);
  }


  Math.easeOutQuad = (t, b, c, d) => {
    t /= d;
    return -c * t * (t - 2) + b;
  };


  function startSlideshow() {
    slider.autoTimeOut = setTimeout(() => setPosition(getNextSlide(1), false, false, true), o.slideInterval);
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
    if (o.dots) {
      removeClass(slider.dotWrap.querySelector('.' + classes.dotActiveClass), classes.dotActiveClass);
      addClass(slider.dots[!nrOfClones ? active : Math.abs(slideIndex % (nrOfSlides - nrOfClones))], classes.dotActiveClass);
    }
  }


  function onWidthChange() {
    stopSlideshow();
    setupSlider(getActiveSlideNr());
    shouldResumeSlideshow();
  }


  function touchInit() {
    let startPos,
      currPos,
      currentSlide;

    TouchEvents(slider.container, {
      mouse: o.mouseDrag,
      dragThreshold: o.dragThreshold,
      // Pass touch state actions
      start: (event) => {
        stopSlideshow();
        startPos = getCurrentPosition();
        currentSlide = slideIndex % nrOfSlides;
        // Add drag class
        addClass(slider.container, classes.dragging);
      },
      move: (event, direction, diff) => {
        if (direction === 'left' || direction === 'right') {
          slider.animationFrame = requestAnimationFrame(() => {
            // Calculate changed position
            currPos = startPos + diff.X;

            if (!o.rewind) {
              flip(hasReachedFlipPoint(currPos));
            } else if (!currentSlide && direction === 'right' || helper.isLastSlide(currentSlide) && direction === 'left') {
              // Resist dragging if it's first slide 
              // or last and if rewind is true
              currPos = startPos + (diff.X / 2.5);
            }
            transform(slider.container, currPos);
          });
        }
      },
      end: (event, direction, diff) => {
        let targetSlide = slideIndex;

        // Only set new target slide if drag exceeds minimum drag distance
        if (Math.abs(diff.X) > o.minimumDragDistance) {
          if (direction === 'left') {
            targetSlide = o.rewind && helper.isLastSlide(currentSlide) ? helper.lastSlide : getNextSlide(1);
          } else if (direction === 'right') {
            targetSlide = o.rewind && !currentSlide ? 0 : getNextSlide(-1);
          }
        }
        setPosition(targetSlide, false, o.touchSpeed);
        // Remove drag class
        removeClass(slider.container, classes.dragging);
      }
    });
  }


  function setup() {
    const dotFrag = document.createDocumentFragment();
    slider.container = o.slideContainer || _this.children[0];
    nrOfSlides = slider.container.children.length;
    prefixedTransform = getSupport('transform');

    // Only set widths if one slide is provided or
    // transform is not supported in browser and bail.
    if (nrOfSlides <= 1 || !prefixedTransform) {
      forEachSlide(function(i) {
        this.container.children[i].style.width = '100%';
        this.container.style.width = nrOfSlides * 100 + '%';
      });
      // Remove hardware acceleration if transform is supported
      prefixedTransform && transform(slider.container, 0);
      return;
    }

    // Special case: Add 2 clones if slider only has 2 
    // slides and the infinite carousel effect is used.
    if (!o.rewind && nrOfSlides === 2) {
      const container = slider.container,
        children = container.children;
      container.appendChild(children[0].cloneNode(1));
      container.appendChild(children[nrOfSlides - 1].cloneNode(1));
      nrOfSlides += 2;
      nrOfClones = 2;
    }

    // Make utilities
    helper = makeHelpers();
    // Round slide speed to nearest 10th to work with raf animation loop design
    o.slideSpeed = o.slideSpeed < 2 ? 2 : Math.ceil(o.slideSpeed / 10) * 10;


    forEachSlide(function(i) {
      // Cache slides
      this.slides.push(this.container.children[i]);

      // Prevent slider from breaking when tabbing during slide
      // transition which alters scrollLeft. Set scrollLeft to
      // 0 and slide to focused slide instead.
      addEvent(this.slides[i], 'focus', (e) => {
        stopSlideshow();
        _this.scrollLeft = 0;
        setPosition(i, true);
      }, true);

      if (o.dots) {
        const newDot = document.createElement('li');

        ((dot, nr) => {
          // Don't create dots for clones
          if (nr >= nrOfSlides - nrOfClones) return;

          // Make dots tabbable with "tabindex"
          addClass(dot, classes.dotItem);
          dot.setAttribute('tabindex', 0);
          dot.setAttribute('role', 'button');
          
          dot.innerHTML = '<span></span>';

          // Remove outlines from dots when clicked
          addEvent(dot, 'click', (e) => {
            setPosition(nr, true);
            dot.blur();
          });

          // Don't remove outlines when tabbing and Enter
          // key is used to navigate with dots.
          addEvent(dot, 'keyup', (e) => {
            e.keyCode === 13 && setPosition(nr, true);
          });

          dotFrag.appendChild(dot);
        })(newDot, i);

        // Cache dots
        this.dots.push(newDot);

        // Add dots to slider or given dotContainer element
        if (helper.isLastSlide(i)) {
          this.dotWrap = o.dotContainer || document.createElement('ul');
          this.dotWrap.appendChild(dotFrag);
          
          // Only add classname to dot container and 
          // append it to slider if it's generated
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

    // Listen for touch events
    touchInit();
    setupSlider();

    o.mouseDrag && addClass(slider.container, classes.mouseDrag);
    o.slideShow && startSlideshow();

    // API Callback after setup, expose API first with timeout
    o.onSetup && setTimeout(() => o.onSetup(nrOfSlides), 0);
  }


  // Init
  setup();


  // Expose slider API
  return {
    next,
    prev,
    stop: stopSlideshow,
    start: startSlideshow,
    getActiveSlideNr,
    setupSlider: (slideNr) => setupSlider(slideNr),
    moveTo: (slideNr, speed) => setPosition(slideNr, true, speed)
  };
}

// If jQuery is present, create a plugin.
if (window.jQuery) {
  (($) => {
    $.fn.HammerSlider = function(options) {
      this.each(function() {
        $(this).data('HammerSlider', HammerSlider(this, options));
      });

      return this;
    };
  })(window.jQuery);
}
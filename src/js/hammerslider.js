function HammerSlider(_this, options) {
  'use strict';

  // Main declarations
  let slider = {
    width: undefined,
    contentWidth: undefined,
    slides: [],
    dots: [],
    listeners: [],
  },

  slideData = [],
  currentDistance = 0,

  flipPoints = {},
  slideIndex = 0,
  nrOfSlides = 0,
  nrOfClones = 0,
  currentSlideNr = 0,
  prefixedTransform,
  u; // Utilities


  // Default options
  const o = {
    slideShow: false,
    slideInterval: 5000,
    slideSpeed: 1200,
    touchSpeed: 800,
    startSlide: 0,
    dragThreshold: 10,
    minimumDragDistance: 30,
    stopAfterInteraction: true,
    rewind: false,
    dots: false,
    mouseDrag: false,
    beforeSlideChange: undefined,
    afterSlideChange: undefined,
    onSetup: undefined,
    classPrefix: 'c-slider'
  };


  // Merge user options into defaults
  options && mergeObjects(o, options);


  // Class names
  const classes = {
    dotWrap: `${o.classPrefix}__dots`,
    dotItem: `${o.classPrefix}__dot`,
    slide: `${o.classPrefix}__slide`,
    container: `${o.classPrefix}__container`,
    dotActiveClass: `${o.classPrefix}__dot--is-active`,
    dragging: `${o.classPrefix}__container--is-dragging`,
    mouseDrag: `${o.classPrefix}__container--mouse-drag-enabled`
  };


  function mergeObjects(target, source) {
    for (let key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
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


  function forEachItem(array, callback, startIndex) {
    for (let i = startIndex || 0; i < array.length; i += 1) {
      const returnValue = callback(array[i], i);
      if (returnValue) return returnValue;
    }
    return false;
  }


  function getItemsAsArray(arrayLikeCollection) {
    const returnArray = [];
    forEachItem(arrayLikeCollection, (item) => { returnArray.push(item) });
    return returnArray;
  }


  function getSupportedProperty(property) {
    const prefixes = ['', 'webkit', 'moz', 'ms', 'o'];
    const div = document.createElement('div');

    return forEachItem(prefixes, (prefix) => {
      const formattedProperty = `${prefix ? `-${prefix}-` : ''}${property}`;
      if (typeof div.style[formattedProperty] !== 'undefined') return formattedProperty;
    });
  }


  function getCurrentPosition() {
    const transform = window.getComputedStyle(slider.container, null).getPropertyValue(prefixedTransform);
    const transformType = transform.match('matrix3d') ? 12 : 4;
    return parseFloat(transform.split(',')[transformType]) / slider.container.offsetWidth * 100;
  }


  function translate(el, value, threeD) {
    const type = threeD ? '3d' : 'X';
    el.style[prefixedTransform] = `translate${type}(${value}%${threeD ? ',0,0' : ''})`;
    // return (value) => el.style[prefixedTransform] = `translate${type}(${value}%${threeD ? ',0,0' : ''})`;
  }


  function setItemWidth(containerWidth) {
    return (item, index) => {
      const width = Math.round(((item.element.offsetWidth / containerWidth) * 100));
      return mergeObjects(item, { width });
    };
  }


  function setItemAlignment(alignment) {
    const align = {
      left: (width) => 0,
      center: (width) => (100 - width) / 2,
      right: (width) => 100 - width
    };
    return alignment ? align[alignment] : align['center'];
  }


  function setDistanceToItem(alignItem) {
    return (item, index, itemArray) => {
      const distanceToThis = itemArray.reduce((accumulator, innerItem, innerIndex) => {
        if (innerIndex > index) return accumulator + 0;
        return accumulator + (innerIndex === index ? alignItem(innerItem.width) : -innerItem.width);
      }, 0);
      return mergeObjects(item, { distanceToThis });
    };
  }


  function setDistanceBetweenItems(lastItemIndex) {
    return (item, index, itemArray) => {
      const nextItemIndex = !index ? lastItemIndex : index - 1;
      const distanceToNext = itemArray[nextItemIndex].distanceToThis - item.distanceToThis;
      return mergeObjects(item, { distanceToNext });
    };
  }


  function setItemDistanceToFlip(itemArray) {
    return (item) => {
      const distanceToFlip = itemArray.reduce((accumulator, current) =>
        (accumulator + (current.width / item.width) * 100), 0);
      return mergeObjects(item, { distanceToFlip });
    };
  }


  function makeUtilities() {
    return {
      lastSlide: nrOfSlides - 1,
      isLastSlide: function(nr) {
        return nr === this.lastSlide;
      }
    };
  }


  function setupSlider(startSlide) {
    const pos = startSlide || o.startSlide;

    // Gather calculations
    const setSlideWidth = setItemWidth(slider.container.offsetWidth);
    const setDistanceToSlide = setDistanceToItem(setItemAlignment(o.slideAlign));
    const setDistanceBetweenSlides = setDistanceBetweenItems(nrOfSlides - 1);

    // Store items & make calculations
    slideData = getItemsAsArray(slider.slides)
      .map(slide => ({ element: slide }))
      .map(setSlideWidth)
      .map(setDistanceToSlide)
      .map(setDistanceBetweenSlides);

    // Infinite sliding specific calculations
    if (!o.rewind) {
      const firstSlide = slideData[0];
      const lastSlide = slideData[nrOfSlides - 1];
      const setSlideDistanceToFlip = setItemDistanceToFlip(slideData);

      slider.contentWidth = slideData.reduce((accumulator, slide) => accumulator + slide.width, 0);
      firstSlide.distanceToNext += slider.contentWidth;
      [firstSlide, lastSlide].map(setSlideDistanceToFlip);

      // Position slides
      if (u.isLastSlide(pos)) translate(slider.slides[0], slideData[0].distanceToFlip);
      if (!pos) translate(slider.slides[nrOfSlides - 1], slideData[nrOfSlides - 1].distanceToFlip * -1);
    }

    // Set slider start position and active dot
    currentSlideNr = pos;
    currentDistance = slideData[pos].distanceToThis;
    translate(slider.container, slideData[pos].distanceToThis);
    setActiveDot(pos);
  }


  function flip(position, direction) {
    /* Clean this mess the HELL up */
    if (direction === 1) {
      if (position < (slideData[nrOfSlides - 3].distanceToThis - slideData[nrOfSlides - 3].width / 2)) {
        translate(slider.slides[nrOfSlides - 1], 0);
      }

      if (position < (slideData[nrOfSlides - 2].distanceToThis - slideData[nrOfSlides - 2].width / 2)) {
        translate(slider.slides[0], slideData[0].distanceToFlip);
      }

      if (position < (slideData[nrOfSlides - 1].distanceToThis - slideData[nrOfSlides - 1].width / 2)) {
        translate(slider.slides[0], 0);
        translate(slider.slides[nrOfSlides - 1], slideData[nrOfSlides - 1].distanceToFlip * -1);
        return true;
      }
    } else {
      if (position > (slideData[nrOfSlides - 3].distanceToThis - slideData[nrOfSlides - 3].width / 2)) {
        translate(slider.slides[nrOfSlides - 1], slideData[nrOfSlides - 1].distanceToFlip * -1);
      }

      if (position > (slideData[nrOfSlides - 2].distanceToThis - slideData[nrOfSlides - 2].width / 2)) {
        translate(slider.slides[0], 0);
      }

      if (position > slideData[0].distanceToThis + slideData[0].width / 2) {
        translate(slider.slides[0], slideData[0].distanceToFlip);
        translate(slider.slides[nrOfSlides - 1], 0);
        return true;
      }
    }
  }


  function getNextSlideNumber(slideNumber, direction) {
    if (direction > 0) {
      if (u.isLastSlide(slideNumber)) return 0;
    } else if (!slideNumber) {
      return u.lastSlide;
    }
    return slideNumber + direction;
  }


  function setPosition(direction, jumpTo) {
    let nextSlideNumber;
    let slideDistance;

    if (typeof jumpTo === 'undefined') {
      nextSlideNumber = getNextSlideNumber(currentSlideNr, direction);
      const index = nextSlideNumber + 1 > nrOfSlides - 1 ? 0 : nextSlideNumber + 1;
      const distance = direction === 1 ? slideData[nextSlideNumber].distanceToNext : slideData[index].distanceToNext;
      slideDistance = currentDistance - distance * direction;
    } else {
      direction = jumpTo - currentSlideNr > 0 ? 1 : -1;
      nextSlideNumber = jumpTo;
      slideDistance = slideData[jumpTo].distanceToThis;
    }

    currentDistance = slideDistance;
    currentSlideNr = nextSlideNumber;
    // API Callback
    //o.beforeSlideChange && o.beforeSlideChange(activeSlide);

    stopSlideshow();
    setActiveDot(currentSlideNr);
    slide(slideDistance, direction);
  }


  function slide(slideDistance, direction) {
    let slideSpeed = o.slideSpeed,
      currPos = getCurrentPosition(),
      start = currPos,
      change = slideDistance - start,
      currentTime = 0,
      increment = 20;

    function animate() {
      // Sliding ended
      if (currentTime > slideSpeed) {
        //shouldResumeSlideshow(autoSlide);
        //o.afterSlideChange && o.afterSlideChange();
      }
      // Else
      else {
        if (flip(currPos, direction)) {
          currentDistance += slider.contentWidth * direction;
          start += slider.contentWidth * direction;
        }
        currPos = easeOutQuint(currentTime, start, change, slideSpeed);
        currentTime += increment;
        translate(slider.container, currPos, true);
        slider.animationFrame = requestAnimationFrame(animate);
      }
    }
    slider.animationFrame = requestAnimationFrame(animate);
  }


  function easeOutQuint(t, b, c, d) {
    t /= d;
    t--;
    return c*(t*t*t*t*t + 1) + b;
  };


  function startSlideshow() {
    slider.autoTimeOut = setTimeout(() => setPosition(u.getNextSlideNr(1), false, false, true), o.slideInterval);
  }


  function stopSlideshow() {
    cancelAnimationFrame(slider.animationFrame);
    clearTimeout(slider.autoTimeOut);
  }


  function shouldResumeSlideshow(autoSlide) {
    (o.slideShow && !o.stopAfterInteraction || autoSlide) && startSlideshow();
  }


  function move(direction) {
    setPosition(direction);
  }


  function next() {
    move(1);
  }


  function prev() {
    move(-1);
  }


  function setActiveDot(active) {
    if (o.dots) {
      removeClass(slider.dotWrap.querySelector(`.${classes.dotActiveClass}`), classes.dotActiveClass);
      addClass(slider.dots[!nrOfClones ? active : Math.abs(slideIndex % (nrOfSlides - nrOfClones))], classes.dotActiveClass);
    }
  }


  function onWidthChange() {
    // update slider width
    //stopSlideshow();
    //shouldResumeSlideshow();
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
        startPos = getCurrentPosition() / slider.container.offsetWidth * 100;
        currentSlide = slideIndex % nrOfSlides;
        // Add drag class
        addClass(slider.container, classes.dragging);
      },
      move: (event, direction, diff) => {
        if (direction === 'left' || direction === 'right') {
          const horizontalDiff = diff.X / slider.container.offsetWidth * 100;
          // Calculate changed position
          currPos = startPos + horizontalDiff;

          if (!o.rewind) {
            flip(currPos, direction === 'left' ? 1 : -1);
          } else if (!currentSlide && direction === 'right' || u.isLastSlide(currentSlide) && direction === 'left') {
            // Resist dragging if it's first slide
            // or last and if rewind is true
            currPos = startPos + (diff.X / 2.5);
          }
          translate(slider.container, currPos);
        }
      },
      end: (event, direction, diff) => {
        let targetSlide = slideIndex;

        // Only set new target slide if drag exceeds minimum drag distance
        if (Math.abs(diff.X) > o.minimumDragDistance) {
          if (direction === 'left') {
            targetSlide = o.rewind && u.isLastSlide(currentSlide) ? u.lastSlide : u.getNextSlideNr(1);
          } else if (direction === 'right') {
            targetSlide = o.rewind && !currentSlide ? 0 : u.getNextSlideNr(-1);
          }
        }
        setPosition(targetSlide, false, o.touchSpeed);
        // Remove drag class
        removeClass(slider.container, classes.dragging);
      }
    });
  }


  function setup() {
    slider.container = _this.querySelector(`.${classes.container}`);
    slider.slides = getItemsAsArray(slider.container.querySelectorAll(`.${classes.slide}`));


    nrOfSlides = slider.slides.length;
    prefixedTransform = getSupportedProperty('transform');

    if (nrOfSlides < 2) return;

    // Make utilities
    u = makeUtilities();

    slider.slides.forEach((slide, number) => {
      // Set focus event for slide
      addEvent(slide, 'focus', (e) => {
        stopSlideshow();
        _this.scrollLeft = 0;
        setPosition(false, number);
      }, true);
    });

    if (o.dots) {
      const dotFrag = document.createDocumentFragment();

      slider.slides.forEach((slide, number) => {
        const newDot = document.createElement('li');

        ((dot, nr) => {
          addClass(dot, classes.dotItem);
          dot.setAttribute('tabindex', 0);
          dot.setAttribute('role', 'button');
          dot.innerHTML = '<span></span>';
          addEvent(dot, 'click', e => setPosition(false, nr));
          addEvent(dot, 'keyup', e => e.keyCode === 13 && setPosition(false, nr));
          dotFrag.appendChild(dot);
        })(newDot, number);

        // Cache dots
        slider.dots.push(newDot);

        // Add dots to slider or given dotContainer element
        if (u.isLastSlide(number)) {
          slider.dotWrap = o.dotContainer || document.createElement('ul');
          slider.dotWrap.appendChild(dotFrag);

          // Only add classname to dot container and
          // append it to slider if it's generated
          if (!o.dotContainer) {
            addClass(slider.dotWrap, classes.dotWrap);
            _this.appendChild(slider.dotWrap);
          }
        }
      });
    }


    // Listen for window resize events
    //addEvent(window, 'resize', onWidthChange);
    //addEvent(window, 'orientationchange', onWidthChange);

    // Listen for touch events
    //touchInit();
    setupSlider();

    if (o.mouseDrag) addClass(slider.container, classes.mouseDrag);
    if (o.slideShow) startSlideshow();

    // API Callback after setup, expose API first with timeout
    if (o.onSetup) setTimeout(() => o.onSetup(nrOfSlides), 0);
  }


  // Init
  setup();


  // Expose slider API
  return {
    next,
    prev,
    stop: stopSlideshow,
    start: startSlideshow,
    setupSlider: (slideNr) => setupSlider(slideNr),
    moveTo: (slideNr, speed) => setPosition(slideNr, true, speed)
  };
}

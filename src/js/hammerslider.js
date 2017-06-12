function HammerSlider(_this, options) {
  'use strict';

  // Main declarations
  const SLIDER = {
    contentWidth: undefined,
    container: undefined,
    slides: undefined,
    dotContainer: undefined,
    dots: undefined,
    slideData: undefined,
    transform: undefined,
    currentSlideIndex: undefined,
    lastSlideIndex: undefined,
    isLastSlide: undefined,
    currentDistance: undefined,
    eventListeners: undefined
  };


  // Default options
  const OPTIONS = {
    slideShow: false,
    slideInterval: 5000,
    slideSpeed: 1200,
    touchSpeed: 800,
    startSlide: 0,
    dragThreshold: 10,
    minimumDragDistance: 30,
    stopAfterInteraction: true,
    rewind: false,
    mouseDrag: false,
    dotContainer: undefined,
    beforeSlideChange: undefined,
    afterSlideChange: undefined,
    onSetup: undefined,
    classPrefix: 'c-slider'
  };


  // Merge user options into defaults
  options && mergeObjects(OPTIONS, options);


  // Class names
  const CLASSES = {
    container: `${OPTIONS.classPrefix}__container`,
    slide: `${OPTIONS.classPrefix}__slide`,
    dotContainer: `${OPTIONS.classPrefix}__dots`,
    dotItem: `${OPTIONS.classPrefix}__dot`,
    dotActiveClass: `${OPTIONS.classPrefix}__dot--is-active`,
    dragging: `${OPTIONS.classPrefix}__container--is-dragging`,
    mouseDrag: `${OPTIONS.classPrefix}__container--mouse-drag-enabled`
  };


  function mergeObjects(target, source) {
    for (let key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  }


  function getElementChildren(element, selector, all) {
    return element[`querySelector${(all ? 'All' : '')}`](selector);
  }


  function addEvent(element, event, func, bool) {
    element.addEventListener(event, func, !!bool);
    return { remove: () => element.removeEventListener(event, func, !!bool) };
  }


  function addClass(element, className) {
    element.classList.add(className);
  }


  function removeClass(element, className) {
    element && element.classList.remove(className);
  }


  function forEachItem(array, callback, startIndex) {
    for (let i = startIndex || 0; i < array.length; i += 1) {
      const returnValue = callback(array[i], i);
      if (returnValue) return returnValue;
    }
    return false;
  }


  function getItemsAsArray(nodeList) {
    const returnArray = [];
    forEachItem(nodeList, (item) => { returnArray.push(item) });
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
    const transform = window.getComputedStyle(SLIDER.container, null).getPropertyValue(SLIDER.transform);
    const transformType = transform.match('matrix3d') ? 12 : 4;
    return parseFloat(transform.split(',')[transformType]) / SLIDER.container.offsetWidth * 100;
  }


  function translate(element, value, threeD) {
    const type = threeD ? '3d' : 'X';
    element.style[SLIDER.transform] = `translate${type}(${value}%${threeD ? ',0,0' : ''})`;
    // return (value) => element.style[SLIDER.transform] = `translate${type}(${value}%${threeD ? ',0,0' : ''})`;
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
      const distanceToFlip = itemArray.reduce((accumulator, innerItem) =>
        (accumulator + (innerItem.width / item.width) * 100), 0);
      return mergeObjects(item, { distanceToFlip });
    };
  }


  function setSlideData(container, slides, lastSlideIndex) {
    // Gather calculations
    const setSlideWidth = setItemWidth(container.offsetWidth);
    const setDistanceToSlide = setDistanceToItem(setItemAlignment(OPTIONS.slideAlign));
    const setDistanceBetweenSlides = setDistanceBetweenItems(lastSlideIndex);

    // Copy items & make calculations
    const slideData = [...slides]
      .map(slide => ({ element: slide }))
      .map(setSlideWidth)
      .map(setDistanceToSlide)
      .map(setDistanceBetweenSlides);

    // Infinite sliding specific calculations
    if (!OPTIONS.rewind) {
      const firstSlide = slideData[0];
      const lastSlide = slideData[lastSlideIndex];
      const setSlideDistanceToFlip = setItemDistanceToFlip(slideData);

      SLIDER.contentWidth = slideData.reduce((accumulator, slide) => accumulator + slide.width, 0);
      firstSlide.distanceToNext += SLIDER.contentWidth;
      [firstSlide, lastSlide].map(setSlideDistanceToFlip);
    }
    return slideData;
  }


  function flip(position, direction) {
    /* Clean this mess the HELL up */
    if (direction === 1) {
      if (position < (SLIDER.slideData[SLIDER.lastSlideIndex - 2].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 2].width / 2)) {
        translate(SLIDER.slides[SLIDER.lastSlideIndex], 0);
      }

      if (position < (SLIDER.slideData[SLIDER.lastSlideIndex - 1].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 1].width / 2)) {
        translate(SLIDER.slides[0], SLIDER.slideData[0].distanceToFlip);
      }

      if (position < (SLIDER.slideData[SLIDER.lastSlideIndex].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex].width / 2)) {
        translate(SLIDER.slides[0], 0);
        translate(SLIDER.slides[SLIDER.lastSlideIndex], SLIDER.slideData[SLIDER.lastSlideIndex].distanceToFlip * -1);
        return true;
      }
    } else {
      if (position > (SLIDER.slideData[SLIDER.lastSlideIndex - 2].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 2].width / 2)) {
        translate(SLIDER.slides[SLIDER.lastSlideIndex], SLIDER.slideData[SLIDER.lastSlideIndex].distanceToFlip * -1);
      }

      if (position > (SLIDER.slideData[SLIDER.lastSlideIndex - 1].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 1].width / 2)) {
        translate(SLIDER.slides[0], 0);
      }

      if (position > SLIDER.slideData[0].distanceToThis + SLIDER.slideData[0].width / 2) {
        translate(SLIDER.slides[0], SLIDER.slideData[0].distanceToFlip);
        translate(SLIDER.slides[SLIDER.lastSlideIndex], 0);
        return true;
      }
    }
  }


  function isLastItemIndex(lastIndex) {
    return (index) => index === lastIndex;
  }


  function getNextItemIndex(currentItemIndex, direction) {
    if (direction === 1) {
      if (SLIDER.isLastSlide(currentItemIndex)) return 0;
    } else if (!currentItemIndex) {
      return SLIDER.lastSlideIndex;
    }
    return currentItemIndex + direction;
  }


  function slideTo(direction, jumpTo) {
    /* Clean this mess the HELL up */
    let currentSlideIndex;
    let currentDistance;

    if (typeof jumpTo === 'undefined') {
      currentSlideIndex = getNextItemIndex(SLIDER.currentSlideIndex, direction);
      const index = currentSlideIndex + 1 > SLIDER.lastSlideIndex ? 0 : currentSlideIndex + 1;
      const distance = direction === 1 ? SLIDER.slideData[currentSlideIndex].distanceToNext : SLIDER.slideData[index].distanceToNext;
      currentDistance = SLIDER.currentDistance - distance * direction;
    } else {
      direction = jumpTo - SLIDER.currentSlideIndex > 0 ? 1 : -1;
      currentSlideIndex = jumpTo;
      currentDistance = SLIDER.slideData[jumpTo].distanceToThis;
    }

    mergeObjects(SLIDER, { currentSlideIndex, currentDistance });
    if (OPTIONS.beforeSlideChange) OPTIONS.beforeSlideChange(currentSlideIndex);

    stopSlideshow();
    setActiveDot(currentSlideIndex);
    animate(currentDistance, direction);
  }


  function animate(slideDistance, direction) {
    /* Clean this mess the HELL up */
    let slideSpeed = OPTIONS.slideSpeed,
      currPos = getCurrentPosition(),
      start = currPos,
      change = slideDistance - start,
      currentTime = 0,
      increment = 20;

    function render() {
      // Sliding ended
      if (currentTime > slideSpeed) {
        //shouldResumeSlideshow(autoSlide);
        //OPTIONS.afterSlideChange && OPTIONS.afterSlideChange();
      }
      // Else
      else {
        if (flip(currPos, direction)) {
          SLIDER.currentDistance += SLIDER.contentWidth * direction;
          start += SLIDER.contentWidth * direction;
        }
        currPos = easeOutQuint(currentTime, start, change, slideSpeed);
        currentTime += increment;
        translate(SLIDER.container, currPos, true);
        SLIDER.animationFrame = requestAnimationFrame(render);
      }
    }
    SLIDER.animationFrame = requestAnimationFrame(render);
  }


  function easeOutQuint(t, b, c, d) {
    t /= d;
    t--;
    return c * (t * t * t * t * t + 1) + b;
  };


  function startSlideshow() {
    mergeObjects(SLIDER, {
      autoTimeOut: setTimeout(() => slideTo(1), OPTIONS.slideInterval)
    });
  }


  function stopSlideshow() {
    cancelAnimationFrame(SLIDER.animationFrame);
    clearTimeout(SLIDER.autoTimeOut);
  }


  function shouldResumeSlideshow(autoSlide) {
    if ((OPTIONS.slideShow && !OPTIONS.stopAfterInteraction) || autoSlide) startSlideshow();
  }


  function setActiveDot(index) {
    if (OPTIONS.dots) {
      removeClass(getElementChildren(SLIDER.dotContainer, `.${CLASSES.dotActiveClass}`), CLASSES.dotActiveClass);
      addClass(SLIDER.dots[index], CLASSES.dotActiveClass);
    }
  }


  function onWidthChange() {
    // update slider width
    //stopSlideshow();
    //shouldResumeSlideshow();
  }


  /*function touchInit() {
    let startPos,
      currPos,
      currentSlide;

    TouchEvents(SLIDER.container, {
      mouse: OPTIONS.mouseDrag,
      dragThreshold: OPTIONS.dragThreshold,
      // Pass touch state actions
      start: (event) => {
        stopSlideshow();
        startPos = getCurrentPosition() / SLIDER.container.offsetWidth * 100;
        currentSlide = slideIndex % nrOfSlides;
        // Add drag class
        addClass(SLIDER.container, CLASSES.dragging);
      },
      move: (event, direction, diff) => {
        if (direction === 'left' || direction === 'right') {
          const horizontalDiff = diff.X / SLIDER.container.offsetWidth * 100;
          // Calculate changed position
          currPos = startPos + horizontalDiff;

          if (!OPTIONS.rewind) {
            flip(currPos, direction === 'left' ? 1 : -1);
          } else if (!currentSlide && direction === 'right' || u.isLastSlide(currentSlide) && direction === 'left') {
            // Resist dragging if it's first slide
            // or last and if rewind is true
            currPos = startPos + (diff.X / 2.5);
          }
          translate(SLIDER.container, currPos);
        }
      },
      end: (event, direction, diff) => {
        let targetSlide = slideIndex;

        // Only set new target slide if drag exceeds minimum drag distance
        if (Math.abs(diff.X) > OPTIONS.minimumDragDistance) {
          if (direction === 'left') {
            targetSlide = OPTIONS.rewind && u.isLastSlide(currentSlide) ? u.lastSlide : u.getNextSlideNr(1);
          } else if (direction === 'right') {
            targetSlide = OPTIONS.rewind && !currentSlide ? 0 : u.getNextSlideNr(-1);
          }
        }
        slideTo(targetSlide, false, OPTIONS.touchSpeed);
        // Remove drag class
        removeClass(SLIDER.container, CLASSES.dragging);
      }
    });
  }*/

  // Split into two funcs
  function setItemClickAndEnterEvent() {
    return (item, index) => {
      addEvent(dot, 'click', e => slideTo(false, nr));
      addEvent(dot, 'keyup', e => e.keyCode === 13 && slideTo(false, nr));
      return item;
    };
  }


  function setItemFocusEvent(element) {
    return (item, index) => addEvent(item, 'focus', (e) => {
      stopSlideshow();
      element.scrollLeft = 0;
      slideTo(false, index);
    }, true);
  }


  function setupSlider(element, startIndex) {
    // Setup slide variables
    const container = getElementChildren(element, `.${CLASSES.container}`);
    const slides = getItemsAsArray(getElementChildren(container, `.${CLASSES.slide}`, true));
    const dotContainer = OPTIONS.dotContainer || getElementChildren(element, `.${CLASSES.dotContainer}`);
    const dots = getItemsAsArray(getElementChildren(dotContainer, `.${CLASSES.dotItem}`, true));
    const currentSlideIndex = startIndex;
    const lastSlideIndex = slides.length - 1;
    const isLastSlide = isLastItemIndex(lastSlideIndex);
    const slideData = setSlideData(container, slides, lastSlideIndex);
    const currentDistance = slideData[currentSlideIndex].distanceToThis;
    const transform = getSupportedProperty('transform');
    const setSlideFocusEvent = setItemFocusEvent(element);
    const eventListeners = slides.map(setSlideFocusEvent);

    // Bail if only one slide OR if transform is not supported
    if (!lastSlideIndex || !transform) return;

    // Merge variables into SLIDER
    mergeObjects(SLIDER, {
      container,
      slides,
      dotContainer,
      dots,
      slideData,
      transform,
      currentSlideIndex,
      lastSlideIndex,
      isLastSlide,
      currentDistance,
      eventListeners
    });

    // Set position and active dot
    translate(SLIDER.container, SLIDER.currentDistance);
    setActiveDot(SLIDER.currentSlideIndex);

    // Conditional actions
    if (!OPTIONS.rewind) {
      if (SLIDER.isLastSlide(SLIDER.currentSlideIndex)) translate(SLIDER.slides[0], SLIDER.slideData[0].distanceToFlip);
      if (!SLIDER.currentSlideIndex) translate(SLIDER.slides[SLIDER.lastSlideIndex], SLIDER.slideData[SLIDER.lastSlideIndex].distanceToFlip * -1);
    }

    if (OPTIONS.mouseDrag) addClass(SLIDER.container, CLASSES.mouseDrag);
    if (OPTIONS.slideShow) startSlideshow();

    // API Callback after setup, expose API first with timeout
    if (OPTIONS.onSetup) setTimeout(() => OPTIONS.onSetup(SLIDER.lastSlideIndex + 1), 0);
  }


  // Init
  setupSlider(_this, OPTIONS.startSlide);


  // Expose slider API
  return {
    next: () => slideTo(1),
    prev: () => slideTo(-1),
    stop: stopSlideshow,
    start: startSlideshow,
    //setupSlider: (slideNr) => setupSlider(slideNr),
    //moveTo: (slideNr, speed) => slideTo(slideNr, true, speed)
  };
}

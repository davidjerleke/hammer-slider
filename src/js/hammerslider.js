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
    //touchSpeed: 800,
    startSlide: 0,
    alignSlides: 'center',
    dragThreshold: 10,
    minimumDragDistance: 30,
    stopAfterInteraction: true,
    infinite: true,
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


  // Change to Object.assign()
  function mergeObjects(target, source) {
    for (let key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  }


  function getElementChildren(element, selector, all) {
    return element && element[`querySelector${(all ? 'All' : '')}`](selector);
  }


  function addEvent(element, event, func, bool) {
    element.addEventListener(event, func, !!bool);
    return { remove: () => element.removeEventListener(event, func, !!bool) };
  }


  function addClass(element, className) {
    element && element.classList.add(className);
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


  function getPercentageOfTotal(fraction, total) {
    return fraction / total * 100;
  }


  function getItemsAsArray(nodeList) {
    const returnArray = [];
    if (nodeList) forEachItem(nodeList, (item) => { returnArray.push(item) });
    return returnArray;
  }


  function getSupportedProperty(property) {
    const prefixes = ['', 'webkit', 'moz', 'ms', 'o'];
    const div = document.createElement('div');

    return forEachItem(prefixes, (prefix) => {
      const formattedProperty = `${(prefix ? `-${prefix}-`: '')}${property}`;
      if (typeof div.style[formattedProperty] !== 'undefined') return formattedProperty;
    });
  }


  function getCurrentTranslate(element) {
    const transform = window.getComputedStyle(element, null).getPropertyValue(SLIDER.transform);
    const transformType = transform.match('matrix3d') ? 12 : 4;
    const transformValue = parseFloat(transform.split(',')[transformType]);
    return getPercentageOfTotal(transformValue, element.offsetWidth);
  }


  function setTranslate(element, value, threeD) {
    const type = threeD ? '3d' : 'X';
    const translate = (to) => element.style[SLIDER.transform] = `translate${type}(${to}%${threeD ? ',0,0' : ''})`;
    if (value !== false) translate(value);
    return translate;
  }


  function setItemWidth(containerWidth) {
    return (item, index) => {
      const width = Math.round(getPercentageOfTotal(item.element.offsetWidth, containerWidth));
      return mergeObjects(item, { width });
    };
  }


  function setItemAlignment(alignment) {
    const align = {
      left: (width) => 0,
      center: (width) => (100 - width) / 2,
      right: (width) => 100 - width
    };
    return align[alignment] || align['center'];
  }


  function setDistanceToItem(alignItem) {
    return (item, index, itemArray) => {
      const distanceToThis = itemArray.reduce((accumulator, {width}, innerIndex) => {
        if (innerIndex > index) return accumulator;
        return accumulator + (innerIndex === index ? alignItem(width) : -width);
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


  function setItemDistanceToFlip(lastItemIndex) {
    return (item, index, itemArray) => {
      if (index && index < lastItemIndex) return item;
      const distanceToFlip = itemArray.reduce((accumulator, {width}) =>
        accumulator + getPercentageOfTotal(width, item.width), 0);
      return mergeObjects(item, { distanceToFlip });
    };
  }


  function setItemInfinitePosition(index, lastItemIndex, itemData) {
    if (index && index < lastItemIndex) return;
    const direction = index ? 1 : -1;
    const itemToPosition = itemData[(index ? 0 : lastItemIndex)];
    setTranslate(itemToPosition.element, itemToPosition.distanceToFlip * direction);
  }


  function setSlideData(container, items, lastItemIndex) {
    // Gather calculations
    const setSlideWidth = setItemWidth(container.offsetWidth);
    const setDistanceToSlide = setDistanceToItem(setItemAlignment(OPTIONS.alignSlides));
    const setDistanceBetweenSlides = setDistanceBetweenItems(lastItemIndex);
    const setSlideDistanceToFlip = setItemDistanceToFlip(lastItemIndex);

    // Copy items & make calculations
    const slideData = [...items]
      .map(element => ({ element }))
      .map(setSlideWidth)
      .map(setDistanceToSlide)
      .map(setDistanceBetweenSlides)
      .map(setSlideDistanceToFlip);

    // Infinite sliding specific calculations
    if (OPTIONS.infinite) {
      SLIDER.contentWidth = slideData.reduce((accumulator, {width}) => accumulator + width, 0);
      slideData[0].distanceToNext += SLIDER.contentWidth;
    }
    return slideData;
  }


  function flip(position, direction) {
    /* Clean this mess the HELL up */
    if (direction === 1) {
      if (position < (SLIDER.slideData[SLIDER.lastSlideIndex - 2].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 2].width / 2)) {
        setTranslate(SLIDER.slides[SLIDER.lastSlideIndex], 0);
      }

      if (position < (SLIDER.slideData[SLIDER.lastSlideIndex - 1].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 1].width / 2)) {
        setTranslate(SLIDER.slides[0], SLIDER.slideData[0].distanceToFlip);
      }

      if (position < (SLIDER.slideData[SLIDER.lastSlideIndex].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex].width / 2)) {
        setTranslate(SLIDER.slides[0], 0);
        setTranslate(SLIDER.slides[SLIDER.lastSlideIndex], SLIDER.slideData[SLIDER.lastSlideIndex].distanceToFlip * -1);
        return true;
      }
    } else {
      if (position > (SLIDER.slideData[SLIDER.lastSlideIndex - 2].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 2].width / 2)) {
        setTranslate(SLIDER.slides[SLIDER.lastSlideIndex], SLIDER.slideData[SLIDER.lastSlideIndex].distanceToFlip * -1);
      }

      if (position > (SLIDER.slideData[SLIDER.lastSlideIndex - 1].distanceToThis - SLIDER.slideData[SLIDER.lastSlideIndex - 1].width / 2)) {
        setTranslate(SLIDER.slides[0], 0);
      }

      if (position > SLIDER.slideData[0].distanceToThis + SLIDER.slideData[0].width / 2) {
        setTranslate(SLIDER.slides[0], SLIDER.slideData[0].distanceToFlip);
        setTranslate(SLIDER.slides[SLIDER.lastSlideIndex], 0);
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
    stopSlideshow();
    const currentSlideIndex = direction ? getNextItemIndex(SLIDER.currentSlideIndex, direction) : jumpTo;
    const slideDirection = direction || (jumpTo - SLIDER.currentSlideIndex > 0 ? 1 : -1);

    let currentDistance;

    if (direction) {
      const index = direction === 1 ? currentSlideIndex : getNextItemIndex(currentSlideIndex, 1);
      currentDistance = SLIDER.currentDistance - SLIDER.slideData[index].distanceToNext * direction;
    } else {
      /*
      if ((!SLIDER.currentSlideIndex && SLIDER.isLastSlide(jumpTo)) || (SLIDER.isLastSlide(SLIDER.currentSlideIndex) && !jumpTo)) {
        slideTo(slideDirection * -1);
        return;
      }
      */
      currentDistance = SLIDER.slideData[jumpTo].distanceToThis;
    }

    mergeObjects(SLIDER, { currentSlideIndex, currentDistance });
    if (OPTIONS.beforeSlideChange) OPTIONS.beforeSlideChange(currentSlideIndex);

    setActiveDot(currentSlideIndex);
    animate(currentDistance, slideDirection);
  }


  function animate(slideDistance, direction) {
    /* Clean this mess the HELL up */
    const translate = setTranslate(SLIDER.container, false, true);
    const slideSpeed = OPTIONS.slideSpeed;
    const increment = 20;

    let currPos = getCurrentTranslate(SLIDER.container);
    let currentTime = 0;
    let start = currPos;
    let change = slideDistance - start;

    function render() {
      // Sliding ended
      if (currentTime > slideSpeed) {
        //shouldResumeSlideshow(autoSlide);
        //OPTIONS.afterSlideChange && OPTIONS.afterSlideChange();
      }
      // Else
      else {
        if (OPTIONS.infinite && flip(currPos, direction)) {
          SLIDER.currentDistance += SLIDER.contentWidth * direction;
          start += SLIDER.contentWidth * direction;
        }
        currPos = easeOutQuint(currentTime, start, change, slideSpeed);
        currentTime += increment;
        translate(currPos);
        SLIDER.animationFrame = requestAnimationFrame(render);
      }
    }
    SLIDER.animationFrame = requestAnimationFrame(render);
  }


  function easeOutQuint(t, b, c, d) {
    t /= d;
    t--;
    return c * (t * t * t * t * t + 1) + b;
  }


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
    if (SLIDER.dots) {
      const activeClass = CLASSES.dotActiveClass;
      removeClass(getElementChildren(SLIDER.dotContainer, `.${activeClass}`), activeClass);
      addClass(SLIDER.dots[index], activeClass);
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
        startPos = getCurrentTranslate() / SLIDER.container.offsetWidth * 100;
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
          setTranslate(SLIDER.container, currPos);
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


  function getEventHandler(event, index) {
    const slideToIndex = (index) => slideTo(false, index);
    const handler = {
      click: e => slideToIndex(index),
      focus: (e) => {
        stopSlideshow();
        _this.scrollLeft = 0;
        slideToIndex(index);
      }
    };
    return handler[event];
  }


  function setItemEventHandler(event, bubbles) {
    return (item, index) => {
      const listener = addEvent(item, event, getEventHandler(event, index), bubbles);
      return listener;
    };
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
    const setSlideFocusEvent = setItemEventHandler('focus', true);
    const setDotClickEvent = setItemEventHandler('click', false);
    const eventListeners = slides.map(setSlideFocusEvent).concat(dots.map(setDotClickEvent));

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
    setTranslate(container, currentDistance);
    setActiveDot(currentSlideIndex);

    // Conditional actions
    if (OPTIONS.infinite) setItemInfinitePosition(currentSlideIndex, lastSlideIndex, slideData);

    if (OPTIONS.mouseDrag) addClass(container, CLASSES.mouseDrag);
    if (OPTIONS.slideShow) startSlideshow();

    if (OPTIONS.onSetup) setTimeout(() => OPTIONS.onSetup(SLIDER), 0);
  }


  // Init
  //setupSlider(_this, OPTIONS.startSlide);


  // Expose slider API
  return {
    next: () => slideTo(1),
    prev: () => slideTo(-1),
    stop: stopSlideshow,
    start: startSlideshow,
    init: (startSlideIndex) => {
      // killSlider();
      setupSlider(_this, startSlideIndex || OPTIONS.startSlide);
    }
    //kill: killSlider,
    //moveTo: (slideNr, speed) => slideTo(slideNr, true, speed)
  };
}

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
      left: () => 0,
      center: width => (100 - width) / 2,
      right: width => 100 - width
    };
    return align[alignment] || align['center'];
  }


  function setItemAlignDistance(alignItem) {
    return (item, index, itemArray) => {
      const alignDistance = alignItem(item.width);
      return mergeObjects(item, { alignDistance });
    };
  }


  function setDistanceToItem() {
    return (item, index, itemArray) => {
      const distanceToThis = itemArray.reduce((accumulator, {width}, innerIndex) => {
        if (innerIndex > index) return accumulator;
        return accumulator + (innerIndex === index ? item.alignDistance : -width);
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
      const distanceToFlip = itemArray.reduce((accumulator, {width}) =>
        accumulator + getPercentageOfTotal(width, item.width), 0);
      return mergeObjects(item, { distanceToFlip });
    };
  }


  function setSlideData(container, items, lastItemIndex) {
    const setSlideWidth = setItemWidth(container.offsetWidth);
    const setSlideAlignDistance = setItemAlignDistance(setItemAlignment(OPTIONS.alignSlides));
    const setDistanceToSlide = setDistanceToItem();
    const setDistanceBetweenSlides = setDistanceBetweenItems(lastItemIndex);
    const setSlideDistanceToFlip = setItemDistanceToFlip(lastItemIndex);

    const slideData = [...items]
      .map(element => ({ element }))
      .map(setSlideWidth)
      .map(setSlideAlignDistance)
      .map(setDistanceToSlide)
      .map(setDistanceBetweenSlides)
      .map(setSlideDistanceToFlip);

    // Infinite sliding specific calculations - Move to separate func
    if (OPTIONS.infinite) {
      SLIDER.contentWidth = slideData.reduce((accumulator, {width}) => accumulator + width, 0);
      slideData[0].distanceToNext += SLIDER.contentWidth;
    }
    return slideData;
  }


  /* HUGE REFACTOR BELOW */
  function setForwardFlips() {
    const slideData = SLIDER.slideData;
    const firstSlide = slideData[0];
    const flipData = {};

    let backwardAccumulator = 0;
    const lastFoldWidth = firstSlide.distanceToThis + 1;
    const itemsBackward = [];
    let itemIndex = 0;

    flipData.itemsBackward = forEachItem(SLIDER.slides, () => {
      if (backwardAccumulator >= lastFoldWidth) return itemsBackward;
      itemIndex = getNextItemIndex(itemIndex, -1);
      itemsBackward.push(itemIndex);
      backwardAccumulator += slideData[itemIndex].width;
    });


    const itemBoundIndex = flipData.itemsBackward[flipData.itemsBackward.length - 2] || 0;
    const itemToFlipIndex = getNextItemIndex(itemBoundIndex, -1);


    slideData.forEach((item, index) => {
      const position = index > SLIDER.lastSlideIndex - flipData.itemsBackward.length ?
        item.distanceToFlip * -1 : 0;
      setTranslate(item.element, position);
      mergeObjects(item, { position });
    });

    SLIDER.flipData = flipData;
    SLIDER.flipData[1] = {
      itemBoundIndex,
      itemToFlipIndex
    };
    SLIDER.flipData.resetForward = {
      itemBoundIndex,
      itemToFlipIndex
    };
  }


  function setBackwardFlips() {
    const slideData = SLIDER.slideData;
    const firstSlide = slideData[0];
    const lastSlide = slideData[SLIDER.lastSlideIndex];
    const flipData = {};


    let forwardAccumulator = 0;
    const firstFoldWidth = 100 - firstSlide.alignDistance;
    const itemsForward = [0]; // Remove 0 from here and add it later: SLIDER.flipData.itemsForward.concat(SLIDER.flipData.itemsBackward)
    let itemIndex = 0;

    flipData.itemsForward = forEachItem(SLIDER.slides, () => {
      if (forwardAccumulator >= firstFoldWidth) return itemsForward;
      itemIndex = getNextItemIndex(itemIndex, 1);
      itemsForward.push(itemIndex);
      forwardAccumulator += slideData[itemIndex].width;
    });

    console.log(flipData.itemsForward)
    SLIDER.flipData.itemsForward = flipData.itemsForward;
    /*
    const currentIndex = flipData.itemsForward[flipData.itemsForward.length - 1] || 0;
    const basePosition = slideData[currentIndex].distanceToThis - slideData[currentIndex].alignDistance + (100 - slideData[currentIndex].width + 1);
    */
  }


  function flip(position, direction) {
    const slideData = SLIDER.slideData;
    const firstSlide = slideData[0];

    // Forward
    if (direction === 1) {
      const currentFlip = SLIDER.flipData[direction];
      const boundItem = slideData[currentFlip.itemBoundIndex];
      const flipItem = slideData[currentFlip.itemToFlipIndex];

      if (position < -SLIDER.contentWidth + firstSlide.alignDistance + 1) {
        mergeObjects(currentFlip, SLIDER.flipData.resetForward);
        slideData.forEach((item, index) => {
          const position = index > SLIDER.lastSlideIndex - SLIDER.flipData.itemsBackward.length ?
            item.distanceToFlip * -1 : 0;
          setTranslate(item.element, position);
          mergeObjects(item, { position });
        });
        return true;
      }

      const bound = (() => {
        const boundItemArray = SLIDER.flipData.itemsForward.concat(SLIDER.flipData.itemsBackward);
        if (boundItemArray.indexOf(currentFlip.itemToFlipIndex) < 0) return;

        const itemBound = boundItem.distanceToThis - boundItem.alignDistance - 1;
        let distance = itemBound;

        if (boundItem.position === boundItem.distanceToFlip * -1) {
          distance += SLIDER.contentWidth;
        } else if (boundItem.position === boundItem.distanceToFlip) {
          distance -= SLIDER.contentWidth;
        }

        return distance;
      })();

      if (!bound) return;

      if (position < bound) {
        const itemPosition = flipItem.position + flipItem.distanceToFlip;
        mergeObjects(flipItem, { position: itemPosition });
        mergeObjects(currentFlip, {
          itemBoundIndex: getNextItemIndex(currentFlip.itemBoundIndex, direction),
          itemToFlipIndex: getNextItemIndex(currentFlip.itemToFlipIndex, direction)
        });
        setTranslate(flipItem.element, itemPosition);
      }


    } else {
      const currentFlip = SLIDER.flipData[direction];

      if (position > firstSlide.alignDistance - 1) {
      }
    }

    /*
    else {
      const currentSlide = SLIDER.slideData[counter];
      console.log(backwardCounter)

      if (backwardCounter === 1 && position > slideBeforeLast.distanceToThis - slideBeforeLast.alignDistance + (100 - slideBeforeLast.width - 0.0001)) {
        setTranslate(lastSlide.element, lastSlide.distanceToFlip * -1);
        backwardCounter -= 1;
        return;
      }
      if (backwardCounter > 1 && position > currentSlide.distanceToThis - currentSlide.alignDistance + (100 - currentSlide.width - 0.0001)) {
        setTranslate(currentSlide.element, 0);
        backwardCounter -= 1;
        return;
      }

      if (backwardCounter === 0 && position > firstSlide.distanceToThis - firstSlide.alignDistance + (100 - firstSlide.width - 0.0001)) {
        setTranslate(firstSlide.element, firstSlide.distanceToFlip);
        setTranslate(lastSlide.element, 0);
        backwardCounter = SLIDER.lastSlideIndex;
        return true;
      }
    }*/
  }
  /* HUGE REFACTOR ABOVE */


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
    /* Clean this mess up */
    stopSlideshow();
    const currentSlideIndex = direction ? getNextItemIndex(SLIDER.currentSlideIndex, direction) : jumpTo;
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
    animate(currentDistance);
  }


  function animate(slideDistance) {
    /* Clean this mess up */
    const translate = setTranslate(SLIDER.container, false, true);
    const slideSpeed = OPTIONS.slideSpeed;
    const increment = 20;

    let currPos = getCurrentTranslate(SLIDER.container);
    let currentTime = 0;
    let start = currPos;
    let change = slideDistance - start;

    const direction = slideDistance < currPos ? 1 : -1;

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
    //if (OPTIONS.infinite) setItemInfinitePosition(currentSlideIndex, lastSlideIndex, slideData);

    if (OPTIONS.mouseDrag) addClass(container, CLASSES.mouseDrag);
    if (OPTIONS.slideShow) startSlideshow();

    // REMOVE
    setForwardFlips();
    setBackwardFlips();

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

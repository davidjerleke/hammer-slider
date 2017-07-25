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
    for (let index = startIndex || 0; index < array.length; index += 1) {
      const returnValue = callback(array[index], index, array);
      if (returnValue) return returnValue;
    }
    return false;
  }


  function getItemsAsArray(nodeList) {
    const returnArray = [];
    if (nodeList) forEachItem(nodeList, (item) => { returnArray.push(item) });
    return returnArray;
  }


  function getPercentageOfTotal(fraction, total) {
    return fraction / total * 100;
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


  /* ------ Item calculations ------ */

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


  /* ------ Bound calculations ------ */

  function getItemsWithinGap(gapWidth, direction, itemIndex) {
    const items = [];
    let accumulator = 0;

    return forEachItem(SLIDER.slideData, (item, index, itemArray) => {
      if (accumulator >= gapWidth) return items;
      itemIndex = getNextItemIndex(itemIndex, direction);
      accumulator += itemArray[itemIndex].width;
      items.push(itemIndex);
    });
  }


  function getBoundItems() {
    const gapToFirstSlide = SLIDER.slideData[0].distanceToThis;
    const leftGapWidth = gapToFirstSlide + 1;
    const rightGapWidth = 100 - leftGapWidth + 2;
    const itemsToLeft = getItemsWithinGap(leftGapWidth, -1, 0);
    const itemsToRight = getItemsWithinGap(rightGapWidth, 1, SLIDER.lastSlideIndex);

    return {
      items: itemsToLeft.concat(itemsToRight),
      itemsToLeft,
      itemsToRight
    };
  }


  function getBoundItemPosition(item, direction, isBoundItemToRight) {
    const position = {
      '1': isBoundItemToRight ? 0 : item.distanceToFlip * -1,
      '-1': isBoundItemToRight ? item.distanceToFlip : 0
    };
    return position[direction];
  }


  function positionBoundItems(direction) {
    let isBoundItemToRight = false;

    SLIDER.boundData.items.forEach((itemIndex) => {
      if (!itemIndex) isBoundItemToRight = true;
      const item = SLIDER.slideData[itemIndex];
      const position = getBoundItemPosition(item, direction, isBoundItemToRight);
      setTranslate(item.element, position);
      mergeObjects(item, { position });
    });
  }


  function getBoundStartIndex(items, direction) {
    const itemBoundIndex = items[items.length - 2] || 0;
    const itemToFlipIndex = getNextItemIndex(itemBoundIndex, direction);

    return { itemBoundIndex, itemToFlipIndex };
  }


  function setBoundData() {
    const boundData = getBoundItems();
    const leftBoundStartIndex = getBoundStartIndex(boundData.itemsToLeft, -1);
    const rightBoundStartIndex = getBoundStartIndex(boundData.itemsToRight, 1);

    mergeObjects(boundData, { '1': leftBoundStartIndex });
    mergeObjects(boundData, { '-1': rightBoundStartIndex });

    SLIDER.boundData = boundData;
    positionBoundItems(1);
  }


  /* DO HUGE REFACTOR BELOW */
  function flip(position, direction) {
    const slideData = SLIDER.slideData;
    const firstSlide = slideData[0];

    // Forward
    if (direction === 1) {
      const currentBound = SLIDER.boundData[direction];
      const boundItem = slideData[currentBound.itemBoundIndex];
      const flipItem = slideData[currentBound.itemToFlipIndex];

      if (position < -SLIDER.contentWidth + firstSlide.alignDistance + 1) {
        mergeObjects(currentBound, getBoundStartIndex(SLIDER.boundData.itemsToLeft, -1));
        positionBoundItems(direction);
        return true;
      }

      const bound = (() => {
        if (SLIDER.boundData.items.indexOf(currentBound.itemToFlipIndex) < 0) return;

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

        const opposite = direction * -1;
        const oppositeBound = SLIDER.boundData[opposite];
        mergeObjects(oppositeBound, {
          itemBoundIndex: getNextItemIndex(oppositeBound.itemBoundIndex, direction),
          itemToFlipIndex: currentBound.itemToFlipIndex
        });

        mergeObjects(currentBound, {
          itemBoundIndex: getNextItemIndex(currentBound.itemBoundIndex, direction),
          itemToFlipIndex: getNextItemIndex(currentBound.itemToFlipIndex, direction)
        });
        setTranslate(flipItem.element, itemPosition);
      }


    } else {
      const currentBound = SLIDER.boundData[direction];
      const boundItem = slideData[currentBound.itemBoundIndex];
      const flipItem = slideData[currentBound.itemToFlipIndex];

      if (position > firstSlide.alignDistance - 1) {
        mergeObjects(currentBound, getBoundStartIndex(SLIDER.boundData.itemsToRight, 1));
        positionBoundItems(direction);
        return true;
      }

      const bound = (() => {
        if (SLIDER.boundData.items.indexOf(currentBound.itemToFlipIndex) < 0) return;

        const itemBound = boundItem.distanceToThis - boundItem.alignDistance + (100 - boundItem.width + 1);
        let distance = itemBound;

        if (boundItem.position === boundItem.distanceToFlip * -1) {
          distance += SLIDER.contentWidth;
        } else if (boundItem.position === boundItem.distanceToFlip) {
          distance -= SLIDER.contentWidth;
        }

        return distance;
      })();

      if (!bound) return;

      if (position > bound) {
        const itemPosition = flipItem.position - flipItem.distanceToFlip;
        mergeObjects(flipItem, { position: itemPosition });

        const opposite = direction * -1;
        const oppositeBound = SLIDER.boundData[opposite];
        mergeObjects(oppositeBound, {
          itemBoundIndex: getNextItemIndex(oppositeBound.itemBoundIndex, direction),
          itemToFlipIndex: currentBound.itemToFlipIndex
        });

        mergeObjects(currentBound, {
          itemBoundIndex: getNextItemIndex(currentBound.itemBoundIndex, direction),
          itemToFlipIndex: getNextItemIndex(currentBound.itemToFlipIndex, direction)
        });
        setTranslate(flipItem.element, itemPosition);
      }
    }

  }
  /* DO HUGE REFACTOR ABOVE */


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
    setBoundData();

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

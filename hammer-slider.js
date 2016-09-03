/*
	SLIDER

	TO FIX:
	-------
	*Slider breaks if number of dot elements don't match
	nr of slides.
*/

function HammerSlider(_this, options) {
	'use strict';

	var slider = {},
		slideContainer,
		slideIndex,
		setsOfClones,
		sliderWidth,
		nrOfSlides,
		prefixedTransform;

	
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
		dotWrapSelector: undefined,
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



	function _(element, selector, selectAll) {
		return (selectAll) ? element.querySelectorAll(selector) : element.querySelector(selector);
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



	function transform(value, unit) {
		var u = (unit) ? unit : 'px';
		slideContainer.style[prefixedTransform] = 'translateX(' + value + u + ') translateZ(0)';
	}



	function loopSlides(callback) {
		for (var i = 0; i < nrOfSlides; i++) {
			callback.call(null, i);
		}
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



	function getCurrentPosition() {
		var transform = window.getComputedStyle(slideContainer, null).getPropertyValue(prefixedTransform),
			matrixIndex = transform.match('3d') ? 12 : 4;	// 12 is for IE and 4 for other browsers

		return parseInt(transform.split(',')[matrixIndex]);
	}



	function getResetPosition(percent) {
		var newPos = slideIndex * (!percent ? sliderWidth : 100);
		return (newPos !== 0) ? newPos *= -1 : newPos;
	}



	function setPosition(nextSlide) {
		var next = nextSlide,
			slideDistance,
			direction;

		stopSlideshow();
		
		if (!o.rewind) {
			if (nextSlide === -1 || (nextSlide !== 0 && Math.abs(nextSlide) % nrOfSlides === 0)) {
				if (!once) {
					appendClones();
				}
			}
			if (nextSlide === -1 || (nextSlide < 0 && Math.abs(nextSlide) % nrOfSlides === 0)) {
				transform(nrOfSlides * sliderWidth * -1 + getCurrentPosition());
				next = nrOfSlides - 1;
			}
		}

		slideDistance = next * sliderWidth * -1;
		direction = (nextSlide < slideIndex) ? -1 : 1;
		slideIndex = next;

		if (o.dots) {
			setActiveDot(slideIndex % nrOfSlides);
		}
		slide(slideDistance, direction);
	}



	Math.easeOutQuart = function (currTime, start, change, duration) {
		currTime /= duration;
		currTime--;
		return change * (currTime * currTime * currTime + 1) + start;
	};



	function slide(slideDistance, direction) {
		var currentTime = 0,
			start = getCurrentPosition(),
			change = slideDistance - start,
			increment = 20;

		function animate() {
			if (currentTime === o.slideSpeed) {
				if (o.slideShow && !o.stopAfterInteraction) {
					startSlideshow();
				}
				if (setsOfClones > 1 && slideIndex % nrOfSlides === 0) {
					clearClones();
				}
			} else {
				currentTime += increment;
				transform(Math.easeOutQuart(currentTime, start, change, o.slideSpeed));
				slider.animationFrame = window.requestAnimationFrame(animate);
			}
		}
		animate();
	}



	function startSlideshow() {
		slider.autoTimeOut = setTimeout(next, o.slideInterval);
	}



	function stopSlideshow() {
		window.cancelAnimationFrame(slider.animationFrame);
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
			var activeDot = _(_this, '.' + o.dotActiveClass);

			if (activeDot) {
				removeClass(activeDot, o.dotActiveClass);
			}
			addClass(slider.dots[active], o.dotActiveClass);
		}
	}



	function appendClones() {
		var frag = document.createDocumentFragment();
		setsOfClones++;
		loopSlides(function(i) {
			frag.appendChild(slider.slides[i].cloneNode(1));
		});
		slideContainer.appendChild(frag);
	}



	function clearClones() {
		var slides = _(slideContainer, o.slideSelector, true), 
			totalSlides = slides.length,
			currIndex = totalSlides;

			transform(0);
			setsOfClones = 1;
			slideIndex = 0;

		for (currIndex; currIndex > 0; currIndex--) {
			var current = slides[currIndex - 1];

			if (totalSlides > nrOfSlides && current.parentNode === slideContainer) {
				slideContainer.removeChild(current); 
				totalSlides--;
			}
		}
	}



	function onWidthChange() {
		stopSlideshow();
		sliderWidth = _this.offsetWidth;
		transform(getResetPosition(true), '%');

		if (o.slideShow && !o.stopAfterInteraction) {
			startSlideshow();
		}
	}



	function touchEvents(el, callback) {

		function isMouse(e) {
			try {
	    		e.changedTouches[0];
	    	} catch (e) {
	    		return true;
	    	}
	    	return false;
		}

		var touchsurface = el,
		    dir,
		    swipeType,
		    startX,
		    startY,
		    distX,
		    distY,
		    threshold = 100, 	// Minimum distance to be considered a swipe
		    restraint = 100, 	// Maximum distance allowed at the same time in perpendicular direction
		    allowedTime = 300, 	// Maximum time allowed to travel that distance
		    elapsedTime,
		    startTime,
		    mouseDown = false,
		    handletouch = callback || function(evt, dir, phase, swipetype, distance) {};

	    function touchStart(e) {
	        var touchobj = isMouse(e) ? e : e.changedTouches[0],
	            dist = 0;

	        dir = 'none';
	        swipeType = 'none';
	        startX = touchobj.pageX;
	        startY = touchobj.pageY;
	        startTime = new Date().getTime();
	        handletouch(e, 'none', 'start', 0, swipeType);

	        if (isMouse(e)) {
	        	mouseDown = true;
	        }
	    }

	    function touchMove(e) {
	        e.preventDefault();

	        if (isMouse(e) && !mouseDown) {	// Prevent mousemove from firing before mousedown event is triggered
	        	return;
	        }
	        
	        var touchobj = isMouse(e) ? e : e.changedTouches[0],
	            axis;
	            distX = touchobj.pageX - startX;
	            distY = touchobj.pageY - startY;    

	        if (Math.abs(distX) > Math.abs(distY)) {
	            dir = (distX < 0) ? 'left' : 'right';
	            axis = distX;
	        }
	        else {
	            dir = (distY < 0) ? 'up' : 'down';
	            axis = distY;
	        }
			handletouch(e, dir, 'move', axis, swipeType);
	    }

	    function touchEnd(e) {
	        e.preventDefault();

	        var touchobj = isMouse(e) ? e : e.changedTouches[0];
	            elapsedTime = new Date().getTime() - startTime;
	      
	        if (elapsedTime <= allowedTime) {
	            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
	                swipeType = dir;
	            }
	            else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {
	                swipeType = dir;
	            }
	        }
	        handletouch(e, dir, 'end', (dir =='left' || dir =='right') ? distX : distY, swipeType);

	        if (isMouse(e)) {
	        	mouseDown = false;
	        }
	    }

	    addEvent(_this, 'touchstart', touchStart);
    	addEvent(_this, 'touchmove', touchMove);
    	addEvent(_this, 'touchend', touchEnd);

    	if (o.mouseDrag) {
	    	addEvent(_this, 'mousedown', touchStart);
	    	addEvent(_this, 'mousemove', touchMove);
	    	addEvent(_this, 'mouseup', touchEnd);
    	}
	}



    function setup() {
		options && mergeObjects(o, options);

		slideContainer = _(_this, o.containerSelector);
		slider.slides = _(slideContainer, o.slideSelector, true);
		slider.dots = _(_this, o.dotWrapSelector).children;

		setsOfClones = 1;
		nrOfSlides = slider.slides.length;
		slideIndex = o.startSlide;
		sliderWidth = _this.offsetWidth;
		prefixedTransform = prefixThis('transform');

		loopSlides(function(i) {
            if (o.dots) {
	            (function(dot, nr) {
	            	dot.innerHTML = '<span></span>';
	            	dot.setAttribute('tabindex', 0);
	            	dot.setAttribute('role', 'button');

		            addEvent(dot, 'click', function(event) {
		            	setPosition(nr);
		            	dot.blur();
		            });

		            addEvent(dot, 'touchend', function(event) {
		            	setPosition(nr);
		            });

		            addEvent(dot, 'keyup', function(event) {	
                    	if (event.keyCode === 13) {
                        	setPosition(nr);
                    	}
                	});

                    addEvent(slider.slides[i], 'focus', slider.slides[i].onfocusin = function(e) {
	                    _this.scrollLeft = 0;
	                    setTimeout(function() {
	                        _this.scrollLeft = 0;
	                    }, 0);
	                    setPosition(nr);
	                }, true);

	            })(slider.dots[i], i);
            }
        });

		transform(o.startSlide ? (o.startSlide * sliderWidth * -1) : 0);

		addEvent(window, 'resize', onWidthChange);
    	addEvent(window, 'orientationchange', onWidthChange);

        if (o.dots) {
        	setActiveDot(o.startSlide || 0);
        }

    	if (o.mouseDrag) {
    		addClass(slideContainer, 'mouse-drag-enabled');
    	}

		if (o.slideShow) {
			startSlideshow();
		}
	}



	setup();

	var startPos,
		currentPos,
		currentSlide,
		once = false;
	
    touchEvents(slideContainer, function(e, dir, phase, distance) {
    	var newPos,
    		direction;

		if (o.mouseDrag) {
			addClass(slideContainer, 'is-dragging');
		}

    	if ('.' + e.target.parentNode.className === o.dotWrapSelector) {
			return;
		}

		if (!o.rewind) {
	    	if (phase === 'start') {
	    		stopSlideshow();
				startPos = getCurrentPosition();
				currentSlide = slideIndex % nrOfSlides;
	    	}

	    	if (phase === 'move' && dir === 'left' || dir === 'right') {
	    		if (!once) {
	    			once = true;

	    			if (slideIndex === 0 && dir === 'right') {
						appendClones();
						transform(nrOfSlides * sliderWidth * -1 + startPos);
						startPos = getCurrentPosition();
						slideIndex = nrOfSlides;
					} 
					if (currentSlide === nrOfSlides - 1 && dir === 'left') {
						appendClones();
					}
				}
				newPos = startPos + distance;
				transform(newPos);
	    	}

	    	if (phase === 'end') {
	    		if (dir === 'left') {
	    			next();
	    		} else if (dir === 'right') {
	    			prev();
	    		} else {
	    			slide(getResetPosition(), (direction) ? 1 : -1);
	    		}
	    		once = false;

	    		if (o.mouseDrag) {
	    			removeClass(slideContainer, 'is-dragging');
	    		}
	    	}
    	}



    	/*
			If rewind is activated
    	*/
    	if (o.rewind) {
	    	if (phase === 'start') {
	    		stopSlideshow();
				startPos = getCurrentPosition();
				currentSlide = slideIndex % nrOfSlides;

	    	} else if (phase === 'move') {

	    		if (dir === 'left' || dir === 'right') {
					if (dir === 'left' && currentSlide === nrOfSlides - 1 && Math.abs(distance) > 100) {
		    			return;
		    		} else if (currentSlide === 0 && distance > 100) {
		    			return;
		    		}
		    		newPos = startPos + distance;
		    		transform(newPos);
	    		}
	    	} else if (phase === 'end') {

	    		if (dir === 'left') {
	    			if (currentSlide !== nrOfSlides - 1 && Math.abs(distance) > 30) {
	    				next();
	    				return;
	    			}
	    		} else if (dir === 'right') {
	    			if (currentSlide === 0 || distance < 30) {
	    				direction = 1;
	    			} else {
	    				prev();
	    				return;
	    			}
	    		}
				slide(getResetPosition(), (direction) ? 1 : -1);
	    	}
    	} /* Rewind ends */
	});


	return {
		next: next,
		prev: prev,
		stop: stopSlideshow,
		start: startSlideshow,
		resize: onWidthChange
	};
}
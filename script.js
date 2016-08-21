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
		slideInstances,
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
		dotActiveClass: undefined
	};



	function mergeObjects(target, source) {
		for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
	}



	function _(element, selector, selectAll) {
		if (selectAll) {
			return element.querySelectorAll(selector);
		} else {
			return element.querySelector(selector);
		}
	}



	function prefixThis(prop) {
		var prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'],
            block = document.createElement('div');

        for (var i in prefixes) {
            if (typeof block.style[prefixes[i] + prop] !== 'undefined') {
            	return prefixes[i] + prop;
            }
        }
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
			matrixIndex = (transform.match('3d')) ? 12 : 4;	// 12 is for IE and 4 for other browsers

		return parseInt(transform.split(',')[matrixIndex]);
	}



	function getResetPosition(width) {
		var newPos = slideIndex * width;
		if (newPos !== 0) {
			newPos *= -1;
		}
		return newPos;
	}



	function setPosition(nextSlide) {
		var next = nextSlide;

		clearTimeout(slider.autoTimeOut);
		window.cancelAnimationFrame(slider.slideTimeOut);
		
		if (!o.rewind) {
			if (nextSlide === -1 || (nextSlide !== 0 && Math.abs(nextSlide) % nrOfSlides === 0)) {
				var frag = document.createDocumentFragment();
				slideInstances++;

				loopSlides(function(i) {
					frag.appendChild(slider.slides[i].cloneNode(1));
				});
				slideContainer.appendChild(frag);
			}
			if (nextSlide === -1 || (nextSlide < 0 && Math.abs(nextSlide) % nrOfSlides === 0)) {
				transform(nrOfSlides * sliderWidth * -1);
				next = nrOfSlides - 1;
			}
		}

		var slideDistance = next * sliderWidth * -1, 
			direction = (nextSlide < slideIndex) ? -1 : 1;
		
		slideIndex = next;

		if (o.dots) {
			setActiveDot(slideIndex % nrOfSlides);
		}
		slide(slideDistance, direction);
	}



	Math.easeOutQuad = function (currTime, start, change, duration) {
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
					autoSlide();
				}
				if (slideInstances > 1 && slideIndex % nrOfSlides === 0) {
					clearClones();
				}
			} else {
				currentTime += increment;

				var val = Math.easeOutQuad(currentTime, start, change, o.slideSpeed);
				transform(val);

				slider.slideTimeOut = window.requestAnimationFrame(animate);
			}
		}
		animate();
	}



	function autoSlide() {
		slider.autoTimeOut = setTimeout(next, o.slideInterval);
	}



	function next() {
		move(1);
	}



	function prev() {
		move(-1);
	}



	function setActiveDot(active) {
		if (o.dotActiveClass) {
			loopSlides(function(i) {
				var elClass = slider.dots[i].classList;

				if (i === active) {
					elClass.add(o.dotActiveClass);
				} else if (elClass.contains(o.dotActiveClass)) {
					elClass.remove(o.dotActiveClass);
				}
			});
		}
	}



	function clearClones() {
		var slides = _(slideContainer, o.slideSelector, true), 
			totalSlides = slides.length,
			currIndex = totalSlides;

			transform(0);
			slideInstances = 1;
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
		var moveTo = getResetPosition(100);
		window.cancelAnimationFrame(slider.slideTimeOut);
		clearTimeout(slider.autoTimeOut);
		sliderWidth = _this.offsetWidth;
		transform(moveTo, '%');

		if (o.slideShow && !o.stopAfterInteraction) {
			autoSlide();
		}
	}



	function addEvent(el, event, func) {
		el.addEventListener(event, func, false);
    }



    function setup() {
		options && mergeObjects(o, options);

		slideContainer = _(_this, o.containerSelector);
		slider.slides = _(slideContainer, o.slideSelector, true);
		slider.dots = _(_this, o.dotWrapSelector).children;

		slideInstances = 1;
		nrOfSlides = slider.slides.length;
		slideIndex = o.startSlide;
		sliderWidth = _this.offsetWidth;
		prefixedTransform = prefixThis('transform');

		loopSlides(function(i) {
            if (o.dots) {
	            (function(dot, nr) {
		            addEvent(slider.dots[nr], 'click', function(event) {
		            	setPosition(nr);
		            }, false);
	            })(slider.dots, i);
            }
        });

		transform(o.startSlide ? (o.startSlide * sliderWidth * -1) : 0);

		addEvent(window, 'resize', onWidthChange);
    	addEvent(window, 'orientationchange', onWidthChange);

        if (o.dots) {
        	setActiveDot(o.startSlide || 0);
        }

		if (o.slideShow) {
			autoSlide();
		}
	}


	
	setup();



	return {
		next: next,
		prev: prev,
		resize: onWidthChange
	};
}
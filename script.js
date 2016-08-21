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
		resizing;

	
	var o = {
		slideShow: false,
		slideInterval: false,
		stopAfterInteraction: false,
		startSlide: 0,
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



	function _(el, sel, all) {
		if (all) {
			return el.querySelectorAll(sel);
		} else {
			return el.querySelector(sel);
		}
	}



	function loopSlides(callback) {
		for (var i = 0; i < nrOfSlides; i++) {
			callback.call(null, i);
		}
	}



	function transform(value, unit) {
		var u = (unit) ? unit : 'px';
		slideContainer.style.transform = 'translateX(' + value + u + ') translateZ(0)';
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
		var style = window.getComputedStyle(slideContainer, null),
			transform =	style.getPropertyValue('-webkit-transform') ||
				style.getPropertyValue('-moz-transform') ||
				style.getPropertyValue('-ms-transform') ||
				style.getPropertyValue('transform'),

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
		clearTimeout(slider.slideTimeOut);
		
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
		resizing = false;

		if (o.dots) {
			setActiveDot(slideIndex % nrOfSlides);
		}

		slide(slideDistance, direction);
	}



	function slide(slideDistance, direction) {
		(function animate() {
			var currentPosition = getCurrentPosition();
		
			if (currentPosition === slideDistance) {
				if (o.slideShow && !o.stopAfterInteraction) {
					autoSlide();
				}
				if (slideInstances > 1 && slideIndex % nrOfSlides === 0) {
					clearClones();
				}
			} else {
				var newPosition,
					pause = 10;

				if (resizing) {
					newPosition = getResetPosition(sliderWidth);
					pause = o.slideInterval * 2;
				} else {
					newPosition = currentPosition - Math.ceil(Math.abs(slideDistance - currentPosition) * 0.1) * direction;
				}

				window.requestAnimationFrame(function() {
					transform(newPosition);
				});
				slider.slideTimeOut = setTimeout(animate, pause);
			}
		}());
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
		resizing = true;
		sliderWidth = _this.offsetWidth;

		transform(moveTo, '%');
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
		resizing = false;

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
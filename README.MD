#HammerSlider touch

[Check out the demo](https://codepen.io/DavidCetinkaya/pen/oYgxgG)

Yet another touch slider. Yada yada yada...

HammerSlider is a lightweight slider with infinite carousel and rewind features.
Comes with customizable settings and its own API for extensibility.

- Works with Mousedrag Events, Touch Events, Pointer Events and IE10 Pointer Events.
- Only 8.6k minified. ~3.3k with Gzip.
- IE10+ compatible.
- Library agnostic. If jQuery is available, it will register itself as a plugin.
- API and callback functions for extensibility.
- Animates with CSS3 transforms and requestAnimationFrame for smooth sliding.

##Files
- **[hammerslider.min.js](https://raw.github.com/)** - production script (requestAnimationFrame polyfill included)
- **[hammerslider.required.css](https://raw.github.com/)** - required styles for proper functioning

##Install

```
npm install hammer-slider
```

##Usage

HTML markup:

```html
<div class="c-slider" id="hammer-slider">
  <div class="c-slider__container">
    <div class="c-slider__slide">
  	  ...
    </div>
    <div class="c-slider__slide">
  	  ...
    </div>
    <div class="c-slider__slide">
  	  ...
    </div>
  </div>
</div>
```

Javascript:

```javascript
const slider = HammerSlider(document.getElementById('hammer-slider'));
```

Or javascript + jQuery:

```javascript
$('#hammer-slider').HammerSlider();
```

You may place anything you want within the slides.

##Settings

HammerSlider accepts an object as an optional second parameter. Default settings are:

```javascript
{
  //Slide transition speed, higher number for slower speed
  slideSpeed: 50,

  //Slide transition speed after touch interaction
  touchSpeed: 50,
  
  //Slide number to start with, zero based index
  startSlide: 0,
  
  //Auto sliding feature
  slideShow: false,
  
  //Interval for auto sliding, ms
  slideInterval: 5000,
  
  //Stop slideShow after touch, click or resize
  stopAfterInteraction: true,
  
  //Disable infinite carousel effect
  rewind: false,

  //Enables mouse to drag between slides
  mouseDrag: false,

  //Minimum drag/touch distance for slide change to occur after touch, pixels
  minimumDragDistance: 30,

  //Minimum distance required before preventing vertical scroll, pixels
  dragThreshold: 10,
  
  //Prefix used for generated elements,
  //such as dots and mouse-drag-enabled etc.
  //Change the stylesheet according to this!
  cssPrefix: 'c-slider',

  //Generate dots
  dots: false,
  
  //Element that will contain dots. By default it will be generated and appended to slider root element. 
  //Can be anywhere on the page.
  dotContainer: undefined,
  
  //Element that contain slides. First child of slider root element will be used by default.
  slideContainer: undefined,

  //Callback function, runs before slide transition when slide change is triggered.
  //Recieves upcoming slide number as parameter.
  beforeSlideChange: undefined,
  
  //Callback function, runs after a slide transition is finished.
  //Receives current slide number as parameter.
  afterSlideChange: undefined,
  
  //Callback function, runs after slider is set up.
  //Receives total number of slides as parameter.
  onSetup: undefined
}
```

##API

HammerSlider exposes a set of functions upon setup that can be used to control the slider externally:

```javascript
//Change to next slide
next();

//Change to previous slide
prev();

//Stop slideshow
stop();

//Start slideshow
start();

//Get current active slide number
getActiveSlideNr();

//Slide to slide number passed as a parameter
moveTo(number);

//Recalculates slider's and slides' widths and resets slider position to slide number parameter. 
//Useful when slider is used in a lightbox or when container width changes. 
//This is invoked on window resize and orientation change.
setupSlider(number);
```

##Examples

JavaScript

```javascript
const slider = HammerSlider(document.getElementById('hammer-slider'), {
  slideSpeed: 60,
  slideShow: true,
  slideInterval: 4000,
  dots: true,
  mouseDrag: true,
  beforeSlideChange: (targetSlide) => {
	console.log('Changing to slide number: ' + targetSlide);
  }
});

document.getElementById('next-btn').addEventListener('click', slider.next, false);
```

JavaScript + jQuery

```javascript			
$('#hammer-slider').HammerSlider({
  slideSpeed: 60,
  slideShow: true,
  slideInterval: 4000,
  dots: true,
  mouseDrag: true,
  beforeSlideChange: (targetSlide) => {
	console.log('Changing to slide number: ' + targetSlide);
  }
});

$('#next-btn').on('click', slider.data('HammerSlider').next);
```

##License

[MIT license](http://opensource.org/licenses/MIT)
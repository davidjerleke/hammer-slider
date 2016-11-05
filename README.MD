#HammerSlider touch

[Check out the demo](https://codepen.io/DavidCetinkaya/pen/oYgxgG)

Yet another touch slider. Yada yada yada...

- Works with Mousedrag Events, Touch Events, Pointer Events and IE10 Pointer Events.
- Only 8.4k minified. ~3.2k with Gzip.
- IE10+ compatible.
- Library agnostic. If jQuery is available, registers itself as a plugin.
- API and callback functions for extensibility.
- Animates with CSS3 transforms and requestAnimationFrame for smooth sliding.

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
var slider = HammerSlider(document.getElementById('hammer-slider'));
```

Or javascript + jQuery:

```javascript
$('#hammer-slider').HammerSlider();
```

You may place anything you want within the slides.
/* Basic Perlin Fire implementation
Authors: Alex Foster, Zeyu Yang
Heavily adapted from code written by Steve Kautz
*/

// vertex shader
const vshaderSource = `
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

attribute vec4 a_Position;
attribute vec2 a_fireCoord;
attribute vec2 a_noiseCoord;

varying vec2 ffireCoord;
varying vec2 fnoiseCoord;

void main()
{
  ffireCoord = a_fireCoord;
  fnoiseCoord = a_noiseCoord;
  gl_Position = projection * view * model * a_Position;
}
`;

// fragment shader
const fshaderSource = `
precision mediump float;
uniform sampler2D noisesampler;
uniform sampler2D firesampler;
uniform float numRects;
varying vec2 ffireCoord;
varying vec2 fnoiseCoord;
void main()
{
  // sample from the texture at the interpolated texture coordinate,
  // and use the value directly as the surface color
  vec4 color = texture2D(noisesampler, fnoiseCoord);
  vec4 fireColor = texture2D(firesampler, ffireCoord);
  //fireColor.a = min(1.0, (fireColor.r + fireColor.g + fireColor.b) / 3.0); //use this line for images with no alpha channel (kinda ugly)

  //gl_FragColor = vec4(color.r, color.g, color.b, color.a);
  //gl_FragColor = fireColor;
  gl_FragColor = vec4(fireColor.r, fireColor.g, fireColor.b, min(1.0, (fireColor.a - color.a))/numRects);

}
`;

var model = new THREE.Matrix4();
var camera = new Camera(30, 1.5);
// edit to configure the texture (which is created around line 410 using
// the createNoiseTexture function below.)
var size = 32; //noise sampling amount, higher values can run very slow with a lot of rects
var frequency = 2;
var octaves = 4;
var riseSpeed = 0.02;
var turbSpeed = 0.05;

var time = 0;
var numRects = 6; //try a high sampling rate (128) with 1 rect for a realistic 2d effect,
                   //or a lot of rects (30-60) with a low sampling rate (~16) for a 3d candle-like effect
var numPoints = numRects*6;

var noiseMaker = new ClassicalNoise();

// Creates noise texture at four frequencies starting at the given
// frequency, stored in the red, green, blue, and alpha channels
// of the texture.  The 'octaves'
function createNoiseTexture(size, frequency, octaves, time)
{

  var canvas = document.createElement('canvas');

  canvas.height=size;
  canvas.width=size;

  //
  // create an image programmatically by drawing to an offscreen html canvas
  //
  var context = canvas.getContext("2d");
  var imageData=context.createImageData(size, size*numRects);
  // The property 'data' will contain an array of int8
  var data=imageData.data;
  let delta = (1.0 / size);
  let base = 0;
  for(let r = 0; r < numRects; r++){
    let degree = r*180.0/numRects;
    for (let i = 0; i < size; ++i)
    {
      let x = i * delta;
      for (let j = 0; j < size; ++j)
      {
        let y = j * delta;
        base = r*size*size + i*size + j;
        let nn = 0.0;
        let f = frequency;
        octaves = 4;
        for (let k = 0; k < octaves; ++k)
        {
          nn += noiseMaker.noise4((x + (time*riseSpeed))*Math.cos(toRadians(degree))*f,
                                   y * f, 
                                  (x + (time*riseSpeed))*Math.sin(toRadians(degree))*f,
                                   time*turbSpeed) / f;
          // values appear to be about +/- .27, so scale appropriately
          // to store as a color value in [0, 255]
          let nnn = (nn + 0.5) * 256;
          data[base * 4 + k] = nnn;
          f *= 2;
        }

      } // j loop
    } // i loop
  } // r loop (rotation)

  context.putImageData(imageData, 0, 0); // at coords 0,0
  return canvas;
}


// Raw data for some point positions - this will be a square, consisting
// of two triangles.  We provide two values per vertex for the x and y coordinates
// (z will be zero by default).

var vertices = [];
for(let i = 0; i < numRects; i++){
  let degree = (180.0/numRects)*i
  //vertices.push(0.0 + i, -0.5, 0.0);
  //vertices.push(1.0 + i, -0.5, 0.0);
  //vertices.push(1.0 + i, 0.5, 0.0);
  //vertices.push(0.0 + i, -0.5, 0.0);
  //vertices.push(1.0 + i, 0.5, 0.0);
  //vertices.push(0.0 + i, 0.5, 0.0);
  vertices.push(-0.5*Math.cos(toRadians(degree)), -0.5, 0.5*Math.sin(toRadians(degree)));
  vertices.push(0.5*Math.cos(toRadians(degree)), -0.5, -0.5*Math.sin(toRadians(degree)));
  vertices.push(0.5*Math.cos(toRadians(degree)), 0.5, -0.5*Math.sin(toRadians(degree)));
  vertices.push(-0.5*Math.cos(toRadians(degree)), -0.5, 0.5*Math.sin(toRadians(degree)));
  vertices.push(0.5*Math.cos(toRadians(degree)), 0.5, -0.5*Math.sin(toRadians(degree)));
  vertices.push(-0.5*Math.cos(toRadians(degree)), 0.5, 0.5*Math.sin(toRadians(degree)));
}
vertices = new Float32Array(vertices);

var fireCoords = [];
for(let i = 0; i < numRects; i++){
  fireCoords.push(0.0, 0.0);
  fireCoords.push(1.0, 0.0);
  fireCoords.push(1.0, 1.0);
  fireCoords.push(0.0, 0.0);
  fireCoords.push(1.0, 1.0);
  fireCoords.push(0.0, 1.0);
}
fireCoords = new Float32Array(fireCoords);

var noiseCoords = [];
for(let i = 0; i < numRects; i++){
  noiseCoords.push(0.0, i);
  noiseCoords.push(1.0, i);
  noiseCoords.push(1.0, (1.0+i));
  noiseCoords.push(0.0, i);
  noiseCoords.push(1.0, (1.0+i));
  noiseCoords.push(0.0, (1.0+i));
}
noiseCoords = new Float32Array(noiseCoords);

// A few global variables...

// the OpenGL context
var gl;

// handle to a buffer on the GPU
var vertexbuffer;
var fireCoordBuffer;
var noiseBuffer;

// handle to the compiled shader program on the GPU
var shader;

// handle to the texture object on the GPU
var textureHandle;
var state = 0;

var fireHandle;

var imageFilename = "../images/firefullalpha4.png"


//translate keypress events to strings
//from http://javascript.info/tutorial/keyboard-events
function getChar(event) {
if (event.which == null) {
return String.fromCharCode(event.keyCode) // IE
} else if (event.which!=0 && event.charCode!=0) {
return String.fromCharCode(event.which)   // the rest
} else {
return null // special key
}
}

//handler for key press events will choose which axis to
//rotate around
function handleKeyPress(event)
{
var ch = getChar(event);
camera.keyControl(ch);
}


// code to actually render our geometry
function draw()
{

  
  // clear the framebuffer
  gl.clear(gl.COLOR_BUFFER_BIT);

  // bind the shader
  gl.useProgram(shader);

  // model/view/projection matrices
  var projection = camera.getProjection();
  var view = camera.getView();
  var loc = gl.getUniformLocation(shader, "model");
  gl.uniformMatrix4fv(loc, false, model.elements);
  loc = gl.getUniformLocation(shader, "view");
  gl.uniformMatrix4fv(loc, false, view.elements);
  loc = gl.getUniformLocation(shader, "projection");
  gl.uniformMatrix4fv(loc, false, projection.elements);

  // set up the vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);
  var positionIndex = gl.getAttribLocation(shader, 'a_Position');
  if (positionIndex < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }
  gl.enableVertexAttribArray(positionIndex);
  gl.vertexAttribPointer(positionIndex, 3, gl.FLOAT, false, 0, 0);

  // set up the fire texture coordinate buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, fireCoordBuffer);
  var fireCoordIndex = gl.getAttribLocation(shader, 'a_fireCoord');
  gl.enableVertexAttribArray(fireCoordIndex);
  gl.vertexAttribPointer(fireCoordIndex, 2, gl.FLOAT, false, 0, 0);

  // set up the noise coordinate buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, noiseBuffer);
  var noiseIndex = gl.getAttribLocation(shader, 'a_noiseCoord');
  gl.enableVertexAttribArray(noiseIndex);
  gl.vertexAttribPointer(noiseIndex, 2, gl.FLOAT, false, 0, 0);

  // we can unbind the buffer now
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // bind our textures to texture units
  var noiseUnit = 3;
  gl.activeTexture(gl.TEXTURE0 + noiseUnit);
  gl.bindTexture(gl.TEXTURE_2D, noiseHandle);

  var fireUnit = 4;
  gl.activeTexture(gl.TEXTURE0 + fireUnit);
  gl.bindTexture(gl.TEXTURE_2D, fireHandle);

  //set up the noise texture sampler uniform
  loc = gl.getUniformLocation(shader, "noisesampler");
  gl.uniform1i(loc, noiseUnit);

  // set up the fire texture sampler uniform
  loc = gl.getUniformLocation(shader, "firesampler");
  gl.uniform1i(loc, fireUnit);

  loc = gl.getUniformLocation(shader, "numRects");
  gl.uniform1f(loc, numRects);

  // draw, specifying the type of primitive to assemble from the vertices
  gl.drawArrays(gl.TRIANGLES, 0, numPoints);
  //gl.drawArrays(gl.LINES, 0, numPoints);

  // unbind shader and "disable" the attribute indices
  // (not really necessary when there is only one shader)
  gl.disableVertexAttribArray(positionIndex);
  gl.useProgram(null);

}


async function main(image) {

  var fire = await loadImagePromise(imageFilename);

  // basically this function does setup that "should" only have to be done once,
  // while draw() does things that have to be repeated each time the canvas is
  // redrawn

  // key handler
  window.onkeypress = handleKeyPress;

  // get graphics context
  gl = getGraphicsContext("theCanvas");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // load and compile the shader pair
  shader = createShaderProgram(gl, vshaderSource, fshaderSource);

  // load the vertex data into GPU memory
  vertexbuffer = createAndLoadBuffer(vertices);
  fireCoordBuffer = createAndLoadBuffer(fireCoords);
  noiseBuffer = createAndLoadBuffer(noiseCoords);

  // specify a fill color for clearing the framebuffer
  gl.clearColor(0.0, 0.05, 0.1, 1.0);

  // create the noise texture
  noise = createNoiseTexture(size, frequency, octaves, time);

  // ask the GPU to create a texture object
  noiseHandle = createAndLoadTexture(noise);
  fireHandle = createAndLoadTexture(fire);

  const freqInput = document.getElementById('frequency')
  freqInput.addEventListener('change', event => {
    frequency = Number(event.target.value)
  })
  const riseInput = document.getElementById('riseSpeed')
  riseInput.addEventListener('change', event => {
    riseSpeed = Number(event.target.value)/100.0;
  })
  const turbInput = document.getElementById('turbSpeed')
  turbInput.addEventListener('change', event => {
    turbSpeed = Number(event.target.value)/100.0;
  })
  const rectInput = document.getElementById('numRects')
  rectInput.addEventListener('change', event => {
    numRects = Number(event.target.value)/100.0;
  })
  // define an animation loop
  var animate = function() {

    draw();
    time++;
    noise = createNoiseTexture(size, frequency, octaves, time);
    noiseHandle = createAndLoadTexture(noise);
    //model = new THREE.Matrix4().makeRotationY(toRadians(0.2)).multiply(model);
    // request that the browser calls animate() again "as soon as it can"
    requestAnimationFrame(animate);
  };

  // start drawing!
  animate();


}

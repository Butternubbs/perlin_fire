
// Basic example of loading an image as a texture and mapping it onto a
// square. Edit the coordinates of the square or edit the texture coordinates
// to experiment.  Image filename is given directly below.  Use the "1" and
// "2" keys to switch from NEAREST to LINEAR magnification filter.
//
// For security reasons the browser restricts access to the local filesystem.
// To run the example, open a command shell in any directory above your examples
// and your teal book utilities, and run python -m SimpleHttpServer 2222
// or python3 -m http.server
// Then point your browser to http://localhost:2222 and navigate to the
// example you want to run.  For alternatives see
// https://github.com/mrdoob/three.js/wiki/How-to-run-things-locally
//

// <script id="vertexShader" type="x-shader/x-vertex">
// attribute vec4 a_Position;
// attribute vec2 a_TexCoord;
// varying vec2 fTexCoord;
// void main()
// {
//   // pass through so the value gets interpolated
//   fTexCoord = a_TexCoord;
//   gl_Position = a_Position;
// }
// </script>
//
// <script id="fragmentShader" type="x-shader/x-fragment">
// precision mediump float;
// uniform sampler2D sampler;
// varying vec2 fTexCoord;
// void main()
// {
//   // sample from the texture at the interpolated texture coordinate,
//   // and use the value directly as the surface color
//   vec4 color = texture2D(sampler, fTexCoord);
//   gl_FragColor = color;
// }
// </script>

// vertex shader
const vshaderSource = `
attribute vec4 a_Position;
attribute vec2 a_TexCoord;
varying vec2 fTexCoord;
void main()
{
  // pass through so the value gets interpolated
  fTexCoord = a_TexCoord;
  gl_Position = a_Position;
}
`;

// fragment shader
const fshaderSource = `
precision mediump float;
uniform int state;
uniform sampler2D sampler;
varying vec2 fTexCoord;
void main()
{
  // sample from the texture at the interpolated texture coordinate,
  // and use the value directly as the surface color
  vec4 color = texture2D(sampler, fTexCoord);

#if 1
  // use a greyscale value in [0, 1], exaggerate contrast
  float c = 0.0;
  if (state == 0)
    c = color.r; // * 2.0;
  else if (state == 1)
    c = color.g; // * 4.0;
  else if (state == 2)
    c = color.b; // * 8.0;
  else if (state == 3)
    c = color.a; // * 16.0;

  gl_FragColor = vec4(c, c, c, 1.0);

#endif

#if 0

  // turbulence (absolute value of noise)

  float fraction = color.r;  // 3.0;
  fraction = abs((fraction - 0.5) * 3.0); // recenter and scale up
    vec4 red = vec4(1.0, 0.0, 0.0, 1.0);
    vec4 yellow = vec4(1.0, 1.0, 0.0, 1.0);
    vec4 c = fraction * red + (1.0 - fraction) * yellow;
    c.a = 1.0;
    gl_FragColor = c;

#endif

}
`;


// edit to configure the texture (which is created around line 410 using
// the createNoiseTexture function below.)
var size = 256;
var frequency = 4;
var octaves = 2;

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
  var imageData=context.createImageData(size, size);
  // The property 'data' will contain an array of int8
  var data=imageData.data;

  let delta = (1.0 / size);
  for (let i = 0; i < size; ++i)
  {
    let x = i * delta;
    for (let j = 0; j < size; ++j)
    {
      let y = j * delta;
      let base = i * size + j;
      let nn = 0.0;
      let f = frequency;
      octaves = 4;
      for (let k = 0; k < octaves; ++k)
      {
        nn += noiseMaker.noise(x * f, y * f + time, 0) / f;

        // values appear to be about +/- .27, so scale appropriately
        // to store as a color value in [0, 255]
        let nnn = (nn + 0.5) * 256;
        data[base * 4 + k] = nnn;
        f *= 2;
      }

    } // j loop
  } // i loop

  context.putImageData(imageData, 0, 0); // at coords 0,0
  return canvas;
}


// Raw data for some point positions - this will be a square, consisting
// of two triangles.  We provide two values per vertex for the x and y coordinates
// (z will be zero by default).
var numPoints = 6;

 var vertices = new Float32Array([
0.0, -0.5,
0.5, -0.5,
0.5, 0.5,
0.0, -0.5,
0.5, 0.5,
0.0, 0.5
]
);

// most straightforward way to choose texture coordinates
var texCoords = new Float32Array([
0.0, 0.0,
1.0, 0.0,
1.0, 1.0,
0.0, 0.0,
1.0, 1.0,
0.0, 1.0,
]);

// A few global variables...

// the OpenGL context
var gl;

// handle to a buffer on the GPU
var vertexbuffer;
var texCoordBuffer;

// handle to the compiled shader program on the GPU
var shader;

// handle to the texture object on the GPU
var textureHandle;
var state = 0;

var imageFilename = "../images/fireimg.png"

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

switch(ch)
{

  case '0':
    state = 0;
    break;
case '1':
  state = 1;
  break;
case '2':
  state = 2;
  break;
case '3':
  state = 3;
  break;
  case '4':
    state = 4;
    break;
    case '5':
      state = 5;
      break;
      case '6':
        state = 6;
        break;
        case '7':
          state = 7;
          break;


  default:
    return;
}
}



// code to actually render our geometry
function draw()
{
  // clear the framebuffer
  gl.clear(gl.COLOR_BUFFER_BIT);

  // bind the shader
  gl.useProgram(shader);

  // bind the vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexbuffer);

  // get the index for the a_Position attribute defined in the vertex shader
  var positionIndex = gl.getAttribLocation(shader, 'a_Position');
  if (positionIndex < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // "enable" the a_position attribute
  gl.enableVertexAttribArray(positionIndex);

  // associate the data in the currently bound buffer with the a_position attribute
  // (The '2' specifies there are 2 floats per vertex in the buffer.  Don't worry about
  // the last three args just yet.)
  gl.vertexAttribPointer(positionIndex, 2, gl.FLOAT, false, 0, 0);

  // bind the texture coordinate buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);

  // get the index for the a_Position attribute defined in the vertex shader
  var texCoordIndex = gl.getAttribLocation(shader, 'a_TexCoord');
  if (texCoordIndex < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // "enable" the a_position attribute
  gl.enableVertexAttribArray(texCoordIndex);

  // associate the data in the currently bound buffer with the a_position attribute
  // (The '2' specifies there are 2 floats per vertex in the buffer.  Don't worry about
  // the last three args just yet.)
  gl.vertexAttribPointer(texCoordIndex, 2, gl.FLOAT, false, 0, 0);

  // we can unbind the buffer now (not really necessary when there is only one buffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // need to choose a texture unit, then bind the texture to TEXTURE_2D for that unit
  var textureUnit = 3;
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);

  // once we have the texture handle bound, we don't need 3
  // to be the active texture unit any longer - what matters is
  // that we pass in 3 when setting the uniform for the sampler
  gl.activeTexture(gl.TEXTURE0);

  var loc = gl.getUniformLocation(shader, "sampler");

  // sampler value in shader is set to index for texture unit
  gl.uniform1i(loc, textureUnit);

  loc = gl.getUniformLocation(shader, "state");
  gl.uniform1i(loc, state);


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

  // load and compile the shader pair
  shader = createShaderProgram(gl, vshaderSource, fshaderSource);

  // load the vertex data into GPU memory
  vertexbuffer = createAndLoadBuffer(vertices);
  texCoordBuffer = createAndLoadBuffer(texCoords);

  // specify a fill color for clearing the framebuffer
  gl.clearColor(0.0, 0.8, 0.8, 1.0);

  // create the noise texture
  image = createNoiseTexture(size, frequency, octaves);

  // ask the GPU to create a texture object
  textureHandle = createAndLoadTexture(image);
  fireHandle = createAndLoadTexture(fire);

  // define an animation loop
  var animate = function() {
	draw();

	// request that the browser calls animate() again "as soon as it can"
    requestAnimationFrame(animate);
  };

  // start drawing!
  animate();


}

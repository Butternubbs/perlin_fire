import "open-simplex-noise";
// Basic example of loading an image as a texture and mapping it onto a
// square. Edit the coordinates of the square or edit the texture coordinates
// to experiment.  Image filename is given directly below.  Use key
// controls to experiment with magnification filter or wrapping behavior.
//
// For security reasons the browser restricts access to the local filesystem.
// To run the example, open a command shell in any directory above your examples
// and your teal book utilities, and run python -m SimpleHttpServer 2222
// or python3 -m http.server
// Then point your browser to http://localhost:2222 and navigate to the
// example you want to run.



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
uniform sampler2D sampler;
varying vec2 fTexCoord;
void main()
{
  // sample from the texture at the interpolated texture coordinate,
  // and use the value directly as the surface color
  vec4 color = texture2D(sampler, fTexCoord);
  gl_FragColor = color;
}
`;


//var imageFilename = "../images/check64.png";
var imageFilename = "../images/check64border.png";
//var imageFilename = "../images/uv_grid.jpg";
//var imageFilename = "../images/clover_really_small.jpg";
//var imageFilename = "../images/brick.png";
//var imageFilename = "../images/steve.png";


// Raw data for some point positions - this will be a square, consisting
// of two triangles.  We provide two values per vertex for the x and y coordinates
// (z will be zero by default).
var numPoints = 6;

 var vertices = new Float32Array([
-0.5, -0.5,
0.5, -0.5,
0.5, 0.5,
-0.5, -0.5,
0.5, 0.5,
-0.5, 0.5
]
);

// alternatively, try vertices for a trapezoid instead of square
//  var vertices = new Float32Array([
// -0.5, -0.5,
// 0.5, -0.5,
// 0.25, 0.5,
// -0.5, -0.5,
// 0.25, 0.5,
// -0.25, 0.5
//  ]
//  );

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


case 'm':
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  break;
case 'M':
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  break;
case 'n':
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  break;
case 'N':
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  break;
case 's':
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  break;
case 'S':
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  break;
case 't':
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  break;
case 'T':
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
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
  var textureUnit = 0;
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, textureHandle);

  // once we have the texture handle bound, we don't need 3
  // to be the active texture unit any longer - what matters is
  // that we pass in 3 when setting the uniform for the sampler
  gl.activeTexture(gl.TEXTURE0);

  var loc = gl.getUniformLocation(shader, "sampler");

  // sampler value in shader is set to index for texture unit
  gl.uniform1i(loc, textureUnit);

  // draw, specifying the type of primitive to assemble from the vertices
  gl.drawArrays(gl.TRIANGLES, 0, numPoints);
  //gl.drawArrays(gl.LINES, 0, numPoints);

  // unbind shader and "disable" the attribute indices
  // (not really necessary when there is only one shader)
  gl.disableVertexAttribArray(positionIndex);
  gl.useProgram(null);

}

// entry point when page is loaded.  Wait for image to load before proceeding
// function main() {
//   var image = new Image();
//   image.onload = function() { startForReal(image); };
//
//   // starts loading the image asynchronously
//   image.src = imageFilename;
// }


async function main(image) {

  var image = await loadImagePromise(imageFilename);

  // key handler
  window.onkeypress = handleKeyPress;

  // get graphics context using its id
  gl = getGraphicsContext("theCanvas");

  // query the GPU for the number of available texture units
  // console.log("Texture units: " + gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
  // var ext = gl.getExtension("EXT_texture_filter_anisotropic");
  // if (ext)
  // {
  //   var max_anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  //   console.log("Anisotropy: " + max_anisotropy)
  // }


  // load and compile the shader pair
  shader = createShaderProgram(gl, vshaderSource, fshaderSource);

  // load the vertex data into GPU memory
  vertexbuffer = createAndLoadBuffer(vertices);

  // load the texture coordinates into GPU memory
  texCoordBuffer = createAndLoadBuffer(texCoords);

  // specify a fill color for clearing the framebuffer
  gl.clearColor(0.0, 0.8, 0.8, 1.0);

  // ask the GPU to create a texture object
  textureHandle = createAndLoadTexture(image);

  // can set texture parameters, see key controls
  //gl.bindTexture(gl.TEXTURE_2D, textureHandle);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // can also change the wrapping behavior, default is gl.REPEAT
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


  // define an animation loop
  var animate = function() {
	draw();

	// request that the browser calls animate() again "as soon as it can"
    requestAnimationFrame(animate);
  };

  // start drawing!
  animate();


}

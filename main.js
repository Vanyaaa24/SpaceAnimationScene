/*****************************
 * CSC 305 - Computer Graphics
 * Assignment 1
 * 
 * Name- Vanya Singla
 * student id - V01047173
 * 
 * Overview
 * This program renders a simple 3D scene of an astronaut floating in space with a starfield background.
 *  The astronaut is made up of basic geometric shapes (cubes and spheres) and has animated arms, legs, 
 * and a floating motion to simulate being in space. 
 * The starfield consists of small spheres that move slowly to create a sense of depth and motion. 
 * The program uses WebGL for rendering and includes basic lighting for a more realistic appearance.
 * 
 * Scene elements:
 *  (1) Jellyfish  - two sphere body + 3 tentacles with wave animation
 *  (2) Astronaut  - hierarchical model (torso, head+visor, arms, legs+feet, chest gadgets)
 *  (3) Starfield  - randomly seeded spheres that drift and reset when offscreen
 *
 * Animation:
 *  - Uses real-time (dt) so motion is frame-rate independent
 *  - TIME accumulates seconds since animation start
 * 
 * main.js - This file contains the main program, the rendering loop, and all the functions to draw objects and handle transformations.
 */
var canvas;  // The canvas element we will draw on
var gl; // The webgl context

var program; //The shader program


//camera biew boundaries(how much we can see)
var near = 1; //closest point to camera we can see
var far = 100; //farthest point to camera we can see


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;

//lightning setup
var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 ); //background light
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 ); //main directional light
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 ); //shiny highlight light

//material prop.; how objects react to light
var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 ); 
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

//MATRIX variable - handle alll transformations here
var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;

//location of matrix uniforms in shader
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye; //camera position
var at = vec3(0.0, 0.0, 0.0); // what camera is looking at 
var up = vec3(0.0, 1.0, 0.0); //the up direction of the camera

//rotation angles(not used in this example)
var RX = 0;
var RY = 0;
var RZ = 0;

//==========================================
//TRANSFORMATION STACK 
//==========================================
var MS = []; // The modeling matrix stack
//gpush add curr modelmatrix to stack
//gpop get top of stack and set as curr modelmatrix
//
//==========================================
//TIME HANDLING FOR ANIMATION
//==========================================
var TIME = 0.0; // Realtime in seconds(SINCE START)
var dt = 0.0 // Delta time (time between frames, since last frame) in seconds
var prevTime = 0.0;  // The time at the previous frame
var resetTimerFlag = true; // A flag to reset the timer when animation is started
var animFlag = true; // A flag to indicate if we are animating or not
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time. You could very easily make a higher level object that stores these as Position, Rotation (and also Scale!)
var sphereRotation = [0,0,0];
var spherePosition = [-4,0,0];

var cubeRotation = [0,0,0];
var cubePosition = [-1,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1.1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];

var jellyFloatingUp = 0.25;
var jellyFloatSpeed =0.5;

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    //calculate lightning products (this creates realistic shading)
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    //send the lightning information to the GPU shaders
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

//==========================================
// MAIN PROGRAM(RUNS ONCE PAGE LOADS)
//==========================================

//*========================
/* STARFIELD SETUP - generated once globally
Static count - stars are reused after they move offscreen, 
so we only need to generate them once and then update their positions each frame
*========================*/



const starscount = 70;
let stars = [];
for(var i=0; i<starscount; i++){

    var originalX = Math.random()*20-10; //random x between -10 and 10
    var originalY = Math.random()*10-5; //random y between -5 and 5

    stars.push({
        x: originalX,
        y: originalY,
        z: Math.random()*-10,  //random z between 0 and -10 (further away)

        originalX: originalX, //saved for reset when star moves offscreen
        originalY: originalY,
        scale: 0.01 + Math.random()*(0.05-0.01) //random  uniform scale

    });
}


window.onload = function init() {

    //get the canvas element from the html page
    canvas = document.getElementById( "gl-canvas" );
    
    //intialize web gl
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //setup viewport and clear color
    gl.viewport( 0, 0, canvas.width, canvas.height );
    //gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 ); //black background
    //enable depth testing(objects in front hide objects behind)
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms(het locations of uniform variables in the shader)
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
    };

    render(0);
}




// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result, x, y, and z are the translation amounts for each axis
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result, theta is the rotation amount, x, y, z are the components of an axis vector (angle, axis rotations!)
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result, x, y, and z are the scale amounts for each axis
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop(); //retreive top of stack
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix); //save current model matrix to stack
}
//==========================================
// RENDERING LOOP (CALLED EACH FRAME)
//function to code in 
//==========================================

function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,1,10); //camera above origin looking down the z axis, change this to move camera around
    at = vec3(0,0,0);
    //eye = vec3(2,2,10);
    //at = vec3(0,-0.5,0);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    //projectionMatrix = perspective(60,1,1,20);
    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is, the new position equals the current position + the rate of of change of that position (often a velocity or speed) times the change in time
		// We can do this with angles or positions, the whole x,y,z position, or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
        TIME += dt;
	}
	

    /*=========
    JELLYFISH
    -Orbits around world origin in circular path
    - body - two spheres, one on top of the other
    - three tentacles with wave animation
    ===========*/

    drawJellyfish(); // call function to draw jellyfish, 

    function drawJellyfish() {
        gPush();

            //rotate coordinate system to the right positiion; anticlockwise rotation to match direction of astronaut's floating
            let circularAngle = TIME * 10 +90; //30 degrees per second
            gRotate(circularAngle, 0,1,0);//rotate around y axis

            //move outward to orbit radius
            let radius = 4.0;
            gTranslate(radius, 0.0, 0.0); //move out along x axis

            /*Tilt body to face tangent of orbit*/
            gRotate(-90,1,0,0);//to face center



            //animate floating up and down
            var floatY = jellyFloatingUp*Math.sin(TIME*jellyFloatSpeed);
            gTranslate(0.0,floatY,0.0);
            //=================//bottom sphere for jellyfish//=================//
            gPush(); 
                setColor(vec4(0.9,0.18,0.8,1.0));
                gScale(0.43,0.40,0.43);
                drawSphere();
            gPop();

            //==================//top sphere tentacle//==================//
            gPush();
                setColor(vec4(0.9,0.18,0.8,1.0)); //purple color
                gTranslate(0.0,0.45,0.0); //move to upper sphere position
                gScale(0.7,0.45,0.7);
                drawSphere();
            gPop();
        
            ////===============TENTACLES=================////
            gPush();
                

                // Each tentacle offset in XZ so they spread around the body
                const offsets = [
                        [0.0,  0.0,  0.35],   // front
                        [0.35, 0.0,  0.0 ],   // right  
                        [0.0,  0.0, -0.35],   // back
                    ];
                for(var i=0; i<3; i++){
                    gPush();
                        gTranslate(offsets[i][0],-0.30,offsets[i][2]); //move to right side
                        drawTentacle();
                    gPop();
                };

                
            gPop();
        gPop();
    }

    /* ==========================================
   TENTACLE
   - 5 ellipsoid segments (scaled spheres)
   - Wave animation: each segment rotates with phase offset
   ========================================== */

    function drawTentacle(){
        setColor(vec4(0.89,0.63,0.26,1.0));
        
        for(var i=0; i<5; i++){
                /*wave rotation:TIME drives the wave i*1.2 is phase offset per segment */
                let wave = Math.sin(TIME*1.5+i*1.2)*13; //2
                
                gRotate(wave,1,0,0) // rotate around X (visible wave after body tilt
                
                //draw one ellipsoid segment of the tentacle
                gPush();
                   
                    gScale(0.12,0.25,0.12);
                    drawSphere();
                gPop();

                gTranslate(0.0,-0.5,0.0);
        }
    }
    

    /* ==========================================
   ASTRONAUT
   - Body oscillates in X and Y (floating in space)
   - Hierarchical: torso → head, arms, legs
   ========================================== */

   //call function
    drawAstronaut();
    function drawAstronaut() {
        
        //=================ANIMATION PARAMETERS=================//
        var armAngle = Math.sin(TIME*2)*25; //animate arm swinging
        var leftlegAngle = Math.sin(TIME*2)*30; //animate leg swinging
        var rightlegAngle = Math.sin(TIME*2 + Math.PI)*30; //animate leg swinging

        var leftknee = Math.sin(TIME*2)*20;
        var rightknee = Math.sin(TIME*2 + Math.PI)*20;

        

        //oscillation for floating feeling, using sine wave for smooth periodic motion
        var bodyX = Math.sin(TIME * 0.8) * 0.5; // Slow drift left/right
        var bodyY = Math.sin(TIME*0.4)*0.15; //animate body swaying
        

        gPush();
        //apply body floats
            gTranslate(bodyX, bodyY, 0.0);

            //=====TORSO=====//
            gPush();
                gTranslate(0.0, -0.5, 0.0); //move torso down so head is above origin
                gRotate(-20,0,1,0);  //tilt

                //==torso cube==//
                gPush();
                setColor(vec4(0.9,0.9,0.9,1.0));
                    //gScale(0.45,0.5,0.35);

                    gScale(0.68,1.0,0.68);
                    drawCube();
                gPop();
                

                //NASA logo on chest======================// just a blue square for simplicity
                gPush();
                    //gl.disable(gl.DEPTH_TEST); //disable depth test to prevent z-fighting
                    gTranslate(0.4,0.4,0.45);
                    gTranslate(-0.6,0.2,0.35 +0.02);
                    setColor(vec4(0.0,0.0,1.0,1.0));
                    gScale(0.2,0.2,0.02);
                    drawSphere();
                    gl.enable(gl.DEPTH_TEST); //re-enable depth test
                gPop();

                //Inlets set 1 (blue top row)
                gPush();
                    //gl.disable(gl.DEPTH_TEST);
                    gTranslate(-0.35,-0.2,0.45);
                    gTranslate(0.26,0.2,0.35 +0.02);
                    setColor(vec4(0.0,0.0,1.0,1.0));
                    gScale(0.1,0.1,0.05);
                    drawSphere();
                    //gl.enable(gl.DEPTH_TEST);
                gPop();
                
                //inlets set1 right 
                gPush();
                    //gl.disable(gl.DEPTH_TEST);
                    gTranslate(0.20,-0.25,0.45);
                    gTranslate(0.0,0.25,0.35 +0.02);
                    setColor(vec4(0.0,0.0,1.0,1.0));
                    gScale(0.1,0.1,0.05);
                    drawSphere();
                    //gl.enable(gl.DEPTH_TEST);
                gPop();

                //INLETS SET 2(2nd row)
                //left
                gPush();
                    gTranslate(-0.31,-0.25,0.45);
                    gTranslate(0.0,-0.1,0.25 +0.01);
                    setColor(vec4(0.855,0.831,0.937,1.0));
                    gScale(0.14,0.14,0.13);
                    drawSphere();
                gPop();

                //right
                //left
                gPush();
                    gTranslate(0.30,-0.25,0.45);
                    gTranslate(0.0,-0.1,0.25 +0.01);
                    setColor(vec4(0.855,0.831,0.937,1.0));
                    gScale(0.14,0.14,0.13);
                    drawSphere();
                gPop();

                //inlets set 3 row3
                //left
                gPush();
                    gTranslate(-0.30,-0.39,0.45);
                    gTranslate(0.0,-0.3,0.15 +0.01);
                    setColor(vec4(0.8,0.592,0.557,1.0));
                    gScale(0.16,0.16,0.13);
                    drawSphere();
                gPop();

                gPush();
                    gTranslate(0.30,-0.39,0.45);
                    gTranslate(0.0,-0.3,0.15 +0.01);
                    setColor(vec4(0.8,0.592,0.557,1.0));
                    gScale(0.16,0.16,0.13);
                    drawSphere();
                gPop();
            gPop();
            //==END TORSO==//

            //=================HEAD=================//
            

            gPush();//head group
                gTranslate(0.0,1.0,0.0);
                gRotate(-15,0,10,0);

                //HELMET 
                gPush();
                    //gTranslate(0.0,0.9,0.0);
                    setColor(vec4(0.89,0.89,0.88,1.0));
                    gScale(0.6,0.6,0.6);
                    drawSphere();
                gPop();

            ///VISOR////
                gPush();    
                    gTranslate(0.0, 0.0, 0.35);
                    setColor(vec4(0.878, 0.584, 0.251, 1.0));
                    gScale(0.55,0.4,0.35);
                    drawSphere();
                gPop();
            gPop();//end head group
            

            //=============left arm=================//
            gPush();
                //gTranslate(-0.3,0.1,0.3);
                gTranslate(-0.35,-0.1,0.0);
                //var motion = 
                gRotate(-20,0,1,0); //tilt to match torso
                gRotate(-25,0,0,1);
                gRotate(-armAngle,1,0,0);
                //gTranslate(-0.8,0.0,0.0);
                gPush();
                    //gTranslate(-0.075, -0.3, 0.0);
                    gTranslate(-0.5,-0.58,0.0);
                    setColor(vec4(0.9,0.9,0.9,1.0));
                    gScale(0.15,0.68,0.15);
                    drawCube();
                gPop();
            gPop();

            //==================right arm====================//
            gPush();

                gTranslate(0.35,-0.1,0.0);
                gRotate(-20,0,1,0); //tilt to match torso
                gRotate(25,0,0,1);
                gRotate(armAngle,1,0,0);
                gPush();
                    gTranslate(0.5,-0.58,0.0);
                    //gRotate(25,0,0,1);
                    setColor(vec4(0.9,0.9,0.9,1.0));
                    gScale(0.15,0.68,0.15);
                    drawCube();
                gPop();

            gPop();

            //================LEGS================//

            //;;;;;;;;;;;;;;;;;;LEFT LEG;;;;;;;;;;;;;;;;;//
            gPush();
                gTranslate(-0.30,-1.3,0.0);  //HIP POSITION
                gRotate(-20,0,1,0); //tilt to match torso
                gRotate(leftlegAngle,1,0,0); //HIP SWING ANIMATION
                //upperleg
                gPush();
                    gTranslate(-0.1,-0.25,0.0); //upper leg cuboid
                    gScale(0.2,1.0,0.25);
                    setColor(vec4(0.9,0.9,0.9,1.0));
                    drawCube();
                gPop();

                /////======//lowerleg&& knee joint//======/////
                gPush();
                
                    gTranslate(-0.1,-1.15,0.0); //upper leg length + knee joint length
                    
                    gRotate(-leftknee,1,0,0); //animate knee joint bending

                    //lower leg -- top starts at knee joint
                    gPush();
                        gTranslate(0.0,-0.90,0.0); //position lower leg
                        gScale(0.2,0.8,0.25);
                        setColor(vec4(0.9,0.9,0.9,1.0));
                        drawCube();
                    gPop();

                    //---------shoe---------//
                    gPush();
                        gTranslate(0.0,-1.70,0.0);


                        // SOLE
                        gPush();
                            gTranslate(0.0, -0.06, 0.05);
                            gScale(0.18, 0.06, 0.40);
                            setColor(vec4(0.9, 0.9, 0.9, 1.0));
                            drawCube();
                        gPop();

                    
                        // HEEL 
                        gPush();
                            gTranslate(0.0, 0.02, -0.12);
                            gScale(0.16, 0.10, 0.16);
                            setColor(vec4(0.9, 0.9, 0.9, 1.0));
                            drawCube();
                        gPop();
                    gPop();//end lower leg and shoe
                gPop();//end knee 
                
            gPop();//end left leg

            //;;;;;;;;;;;;;;;;;;;RIGHT LEG;;;;;;;;;;;;;;;;;//
            gPush();
                gTranslate(0.30,-1.3,0.0); //HIP POSITION
                gRotate(-20,0,1,0); //tilt to match torso
                gRotate(rightlegAngle,1,0,0); //HIP SWING ANIMATION


                //==============upperleg=========================//
                gPush();
                    //gTranslate(0.1,-0.5,0.0);
                    gTranslate(-0.1,-0.25,0.0); //upper leg cuboid
                    gScale(0.2,1.0,0.25);
                    setColor(vec4(0.9,0.9,0.9,1.0));
                    drawCube();
                gPop();
                //========//lowerleg && knee joint//========//
                gPush();
                    
                    gTranslate(-0.1,-1.15,0.0); //upper leg length + knee joint length
                    gRotate(-rightknee,1,0,0); //knee bend animation
                  
                    gPush();
                        
                        gTranslate(0.0,-0.90,0.0);
                        gScale(0.2,0.80,0.25);
                        setColor(vec4(0.9,0.9,0.9,1.0));
                        drawCube();
                    gPop();
                    

                    //---------shoe---------//
                    //---SAME AS LEFT LEG SHOE, JUST TRANSLATED TO MATCH RIGHT LEG POSITION---//

                    gPush();
                        gTranslate(0.0,-1.70,0.0);


                        // SOLE
                        gPush();
                            gTranslate(0.0, -0.06, 0.05);
                            gScale(0.18, 0.06, 0.40);
                            setColor(vec4(0.9, 0.9, 0.9, 1.0));
                            drawCube();
                        gPop();

                    
                        // HEEL
                        gPush();
                            gTranslate(0.0, 0.02, -0.12);
                            gScale(0.16, 0.10, 0.16);
                            setColor(vec4(0.9, 0.9, 0.9, 1.0));
                            drawCube();
                        gPop();

                    

                    gPop(); //end lower leg and shoe
                gPop(); //end knee
            gPop(); //end right leg
        gPop();

        //end astronaut
    }

    /* ==========================================
   STARFIELD
   - Stars generated globally (static count = 70)
   - Each frame: move diagonally (x+, y+)
   - When offscreen: reset to originalX/Y - 12
     (guaranteed to be offscreen bottom-left)
   ========================================== */

    drawStarfield();
    function drawStarfield() {
        
        for(let i=0; i<starscount; i++){
                let s = stars[i];
               
                //update star position to move diagonally across screen
                s.x += 0.01; // horizontal drift
                s.y += 0.03;  // vertical upward

                //==RESER STARS==//
                if(s.y>6||s.x>6){ // reset when past camera
                    s.x = s.originalX -12;
                    s.y = s.originalY -12;
                    //s.z = Math.random()*-10;
                   
                }

                //draw star as small white sphere
                gPush();
                    gTranslate(s.x, s.y, s.z);
                    setColor(vec4(1.0,1.0,1.0,1.0));
                    gScale(s.scale, s.scale, s.scale); //uniform scale for star size
                    drawSphere();
                gPop();
        }   
        
   }

    
    if( animFlag )
        window.requestAnimFrame(render);
}
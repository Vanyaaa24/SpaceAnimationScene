
==============================================
IMPLEMENTED ELEMENTS
==============================================

1. REAL-TIME ANIMATION 
   - All animations use real-time (dt and TIME variables)
   - dt = (timestamp - prevTime) / 1000.0 ensures frame-rate independent motion
   - TIME accumulates elapsed seconds since animation start

2. SPACE JELLY MODELLING 
   - Body consists of two scaled spheres (bottom sphere + dome/bell on top)
   - Each tentacle has 5 ellipsoid segments (scaled spheres)
   - 3 tentacles total, spread around the body in the XZ plane

3. SPACE JELLY TENTACLE ANIMATION 
   - Each tentacle segment rotates using a sine wave with a phase offset per segment
   - wave = Math.sin(TIME * 1.5 + i * 1.2) * 13
   - Creates a smooth travelling wave effect down each tentacle

4. SPACE JELLY TENTACLE POSITIONING 
   - 3 tentacles positioned at equally spaced offsets in the XZ plane:
     Front [0.0, -0.30, 0.35], Right [0.35, -0.30, 0.0], Back [0.0, -0.30, -0.35]

5. SPACE JELLY ANIMATION - CIRCULAR ORBIT 
   - Jellyfish orbits around the world origin using Y-axis rotation
   - circularAngle = TIME * 10 + 90 (starts behind astronaut, moves right-to-front)
   - Implemented using a single gRotate around world Y axis then gTranslate outward
   - Body aligned with orbit tangent using gRotate(-90, 1, 0, 0)
   - Additional up/down floating animation using sine wave

6. ASTRONAUT MODELLING
   - Helmet: sphere with gold visor sphere on front
   - Two arms: single segment each (cube), swing at shoulder
   - Two legs: upper leg (cube) + lower leg (cube) + foot (sole + heel cubes)
     with hip and knee joints
   - Chest details:
       - NASA patch (blue disc sphere)
       - Inlets set 1: two blue small spheres (top row)
       - Inlets set 2: two lavender spheres (middle row)
       - Inlets set 3: two red/pink spheres (bottom row)

7. ASTRONAUT BODY ANIMATION 
   - Body oscillates in X: Math.sin(TIME * 0.8) * 0.5
   - Body oscillates in Y: Math.sin(TIME * 0.4) * 0.15
   - Two different frequencies give a natural floating-in-space feel

8. ASTRONAUT LEG AND ARM ANIMATION 
   - Left and right hips swing in opposite phases (+ Math.PI offset)
   - Left and right knees bend in opposite phases
   - Feet are attached to lower leg and move with the leg (no independent foot animation)
   - Arms swing forward/back at the shoulder in opposite phases

9. STARFIELD 
   - 70 stars generated once globally (outside render loop) - static count
   - Each star is a sphere with random uniform scale (0.01 to 0.05)
   - Stars placed at negative z (behind foreground objects)
   - Each frame: x += 0.01, y += 0.03 (diagonal drift)
   - When offscreen (x > 6 or y > 6): reset to originalX - 12, originalY - 12
     (guaranteed offscreen, maintains uniform distribution over time)
   - Star count stays constant - objects are reused after flying offscreen

10. VISUAL SIMILARITY
    - Scene fits within the 512x512 window using ortho(-6, 6, -6, 6) projection
    - Jellyfish orbits around astronaut at radius 4.0
    - All objects are qualitatively similar in proportion to the sample video

11. PROGRAMMING STYLE
    - Code organized into clearly named functions:
        drawJellyfish(), drawTentacle(), drawAstronaut(), drawStarfield()
    - All sections commented with purpose and parameter explanations
    - Hierarchical transforms clearly marked with gPush/gPop pairs


==============================================
CANVAS SIZE
==============================================
- Canvas is set to 512x512 in index.html

==============================================
FILES INCLUDED
==============================================
- index.html      : HTML page with shaders and canvas
- main.js         : Main JavaScript animation and scene code
- objects.js      : Template geometry (Cube, Sphere, Cylinder, Cone)
- Common/         : Template helper files (MV.js, initShaders.js, webgl-utils.js)
- readme.txt      : This file

==============================================
NOTES / CLARIFICATIONS
==============================================

- SIZES AND COLORS: As stated in the assignment requirements 
  ("You do not have to match the exact motion or dimensions"), 
  exact sizes, proportions, and colors were not matched to the 
  sample video. The scene is qualitatively and visually similar.

- VERTEX SHADER (fColor): The provided HTML template was not 
  modified. The fColor initialization in the vertex shader is 
  as given in the original template code. Any lighting behaviour 
  reflects the template shader as provided.

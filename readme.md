jsmob
=====
A JS add-on to adjust layout on mobile devices.  
jsmob integration makes an existing site become responsive with a minimum HTML/CSS changes.  
Needs jQuery (any version).

For jsmob to work on a HTML page you must:
- add a `<script type="text/javscript" src="path/to/jsmob.js">` at the end of the `<head>` element (or at the end of the `<body>` element)
- affect some class names, following the rules below
- for multi-column parts of the page, drop any float/nest structure if needed (each column must simply be a direct child of its block container)

HANDLING COLUMNS
----------------
Handling a set of columns (col) in a full-width container (block) requires to use the following class names:
- a *%Block* class points out an element having a number of child columns which must change when viewport width varies; such blocks should typically use the whole viewport width (limited to a max-width) and be stacked on the page, both in full and reduced layout
- a *%Break_X* class may be applied:
  - to a block, where it defines the breakPoint between layout modes for this block (reduced layout applies from X (included) downwards  
    NOTE that you may define different breakpoints for different blocks
  - to the `<body>` element, as a default value for any block having no *%Break_X* definition; if omitted at `<body>` level, default is 480  
    In addition, you may simply use the *breakpoint* query parameter to set the default value (see CONFIGURATION OPTIONS below)
- a *%Col* class points out a child column of a block: in reduced layout, these cols are stacked (from top to bottom) in the order defined by the HTML code; all these cols MUST be a set of consecutive siblings; other elements MAY appear before and after this set, and MUST NOT be floating  
NOTE: floating elements may appear inside cols, but must be correctly cleared before the end of the col element
- a *%Width_X* class defines an element's nominal OUTER width, in full layout; for a block, it also defines the max-width of the container (default 1024)
- a *%Fixed* class points out a fixed-width col; in full layout, other cols widths decrease with viewport width proportionaly
- a *%Col_X* class (X: 1-N) indicates the order (from left to right) in which the cols must appear in full layout; if not present, the order will be the same as in reduced layout  
NOTE: in a given block, *%Col_X* should be set for all or none col; defining it for some but not all cols would lead to unpredictable results
- *%LM_X* and *%RM_X* classes define the left (respectively right) margin for a column; in full layout, these margins also decrease proportionaly with the viewport width, even if *%Fixed*; in reduced layout, they don't apply
- a *%Auto* class points out a block where left/right margins will be computed automatically, using the space left free between block width and the sum of its child columns widths; in this case, any *%LM_X* and *%RM_X* are ignored in the child columns


IMPORTANT NOTES about cols width computation:
- since col{display:inline-block;} is used in full layout, remember that adjacent columns margins will NOT collapse
- the site CSS's has not to define any margin-left or -right for a *%Col*: these margins should always be set through *%LM_X* and *%RM_X* classes
- at the opposite, the CSS's may freely define cols padding-left or -right; in full layout, their dimensions remain constant while viewport width varies; in reduced layout, they are dropped; the same applies to border-left or -right
- remember: take these paddings and borders in account when defining "X" in *%Width_X*

####HTML STRUCTURE EXAMPLE
    <div class="%Block %Width_980 %Break_640">
        […elements…]
        <div class="%Col %Width_550 %Col_2 %LM_20 %RM_30">…</div>    
        <div class="%Col %Width_200 %Col_3">…</div>    
        <div class="%Col %Width_180 %Col_1 %Fixed">…</div>    
        […elements…]
    </div>

####RESULTING LAYOUT
        FULL LAYOUT (window.width > 640px)            REDUCED LAYOUT
    +----------------------------------------+    +----------------------+
    |                 %Block                 |    |        %Block        |
    |              […elements…]              |    |     […elements…]     |
    |+----------+----------+     +----------+|    |+--------------------+|
    ||  %Col_1  |  %Col_2  | … … |  %Col_3  ||    ||       %Col_2       ||
    ||          |          |     |          ||    |+--------------------+|
    |+----------+----------+     +----------+|    ||       %Col_3       ||
    |              […elements…]              |    |+--------------------+|
    +----------------------------------------+    ||       %Col_1       ||
                                                  |+--------------------+|
                                                  |     […elements…]     |
                                                  +----------------------+

HANDLING MENUS
--------------
A *%Menu* class points out a menu-wrapper element (may be a direct or indirect parent of the involved menu-heading `<ul>`, which must be the only 1st level `<ul>` in the scope of this parent).  
If it is not embedded in a *%Block* element, it will automatically become itself a block, whose breakpoint will be set to the default one (see above).  
A *%Main* class may be added to one (and only one) *%Menu*: in reduced layout, the menu is  replaced by a "commander" button like <span style="font-weight:1.5em;">**&#9776;**</span>, which toggles the 1st level options (stacked when visible).  
For other menus, 1st level options remain always visible.  
In any case, each 1st level option have a drop-down toggle button in front of it when it has 2nd level options.  
Main menu is intended for a horizontal menu, while simple menu behaviour is particularly suitable for vertical menus.  
CAUTION: a menu may have no more than 2 levels.

HANDLING IMAGES
---------------
Adding a *%Zoom* class to an `<img>` tag (or to an element having one or more direct or indirect `<img>` children) forces the image(s) to zoom-out when the viewport width decreases.  
CAUTION: if the source image is bigger than its nominal display size in full layout, you must also add a *%Width_X* class (see above); otherwise the image's intrinsic width will be used.  
NOTE: images processing remains independant from any breakpoint; a *%Zoom*'ed image simply follows its container width.

GENERAL OPTION
--------------
A *%Opt* class points out an element (block, image, menu-wrapper) which is considered as optional, and will disappear in reduced layout.

SYNTAX RULES
------------
####CLASS NAMES
The "%" prefix, used by default, may be replaced by any prefix of your choice.  
For those classes which define dimensions or numbers, the "_" separator may be replaced by "-", or omitted; so *%Col-2* and *%Col2* are equivalent to *%Col_2*.

####CLASSES USAGE SUMMARY
             +--------------possible target---------------+
             | <body> | Block | Col | Menu | Zoom | <img> |
    ---------+--------+-------+-----+------+------+-------+
    %Auto    |        |   x   |     |      |      |       |
    %Break_X |    x   |   x   |     |  x   |      |       |
    %Col_X   |        |       |  x  |      |      |       |
    %Fixed   |        |       |  x  |      |      |       |
    %Main    |        |       |     |  x   |      |       |
    %LM_X    |        |       |  x  |      |      |       |
    %Opt     |        |   x   |  x  |  x   |   x  |   x   |
    %RM_X    |        |       |  x  |      |      |       |
    %Width_X |    x   |   x   |  x  |      |      |   x   |

####CONFIGURATION OPTIONS
Options may be set using query parameters in the path of the `<script>` tag used to include jsmob, i.e.:
  `<script type="text/javascript" src="path/to/jsmob.js?opt1=val1&opt2=val2…">`

The following options are available:
- *baseWidth*=…    : … is the (px) value for the default block width
- *breakPoint*=…   : … is the (px) value for the default breakpoint
- *cssTimeout*=…   : … is the (ms) delay before launching window.resize() [see also CAVEAT]
- *debug*=1        : some useful informations are displayed in the console
- *liveshow*=1     : adds an indicator to each element having a class like *%Block*, *%Col*, *%Menu*, *%Zoom*; it displays real-time the current element's width, and its title summarizes its "%" classes
- *prefix*=…       : … is any string of your choice, which is substituted to "%"
- *vscroll*=0      : suppress vertical scroll-bar (useful to simulate a mobile while on desktop)

####CAVEAT
Depending on the complexity of the native CSS and/or the number and weight of images included, you may observe some layout inconsistencies (e.g.: column width set to a greater value than stated by %Width!).
It comes from the fact that the current value of cssTimeout may be too short to allow browser to achieve CSS analysis before jsmob begins %classes analysis.
A notable issue happens when using em's to define padding-left/right: then jsmob may begin analyzing when the final font-size has not been defined yet.

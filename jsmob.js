/*---------------------------------------------------------------------#
#          *** Briethings *** - Licensed under the EUPL v1.1           #
# https://joinup.ec.europa.eu/system/files/FR/EUPL v.1.1 - Licence.pdf #
#---------------------------------------------------------------------*/
/*
Look at jsmob.md for details
*/
(function() {
if(typeof $=='undefined'){$=jQuery.noConflict();}
//=============================================================================
var
  _breakPoints={}, // registry built from %Block elements
  _blocks=[], // registry built from %Block elements
  _menus=[], // registry built from %Menu elements
  _uniqueid=0; // used to get tickets for unique id's like "%Id<number>"
var
  _classMap={ // classid in "%<classid>[_<dim>]" classname --> property id
    Break:  'breakPoint',
    Col:    'rank',
    LM:     'leftMargin',
    //Min:    'minWidth',
    RM:     'rightMargin',
    Width:  'baseWidth',
  },
  _constants=[
    'Active', // applied to MNT when clicked down
    'Auto', // user marker for a block to define auto margins
    'Col', // user marker for a col
    'Block', // user marker for a block
    'Ddt', // Drop-down toggle button
    'Fixed', // user marker for a fixed col
    'Id', // (not a classid) used with $('#...')
    'LWD', // Live width display
    'Main', // user marker for a main menu
    'Menu', // user marker for a menu-wrapper
    'Mnt', // Main-nav toggle button
    'Open', // applied to a submenu when currently visible
    'Opt', // user marker for an optional element (dropped in reduced layout)
    'Rootmenu', // applied to root <ul>  to simplfy CSS specifs addressing
    'Stack', // applied to a block when in reduced layout
    'Submenu', // applied to any <ul> which is not the root one
    'Zoom', // user marker for an <img> to follow responsive mechanism
  ],
  _params={
    baseWidth:1024, // default block width
    breakPoint:480, // not nul value -> default breakpoint value
    cssTimeout:5, // 
    debug:0, // 1 -> report informations to console
    liveshow:0, // 1 -> live display elements dimensions
    prefix:'%',
    vscroll:0, // 1 -> display vertical scroll-bar
  },
  _templates={
    Block: function(element) {
      this.id=element.id;
      this.tag=element.tagName; // for further use
      this.autoMargins=false;
      this.baseWidth=_params.baseWidth; // default block width
      this.breakPoint=_params.breakPoint; // default breakpoint value
      this.cols=[]; // (Col objects, in HTML native order)
      this.colsWidth=0; // aggregates all cols width
      this.fixedWidth=0; // aggregates fixed cols width
    },
    Col: function(element) {
      this.id=element.id;
      this.tag=element.tagName; // for further use
      this.rank=0; // layout order number when full
      this.baseWidth=0;
      //this.minWidth=0; ***************************************
      this.fixed=false;
      this.leftMargin=0;
      this.rightMargin=0;
      /* other properties, set during execution:
      . ownPart:  Col.baseWidth / (Block.baseWidth - Block.fixedWidth)
      . LMPart/RMPart: like ownPart, based on Col.leftMargin/rightMargin
      . curWidth/curLM/curRM: computed when window.resize()
      */
    },
    Menu: function(element) {
      this.id=element.id;
      this.tag=element.tagName; // for further use
      this.rootUl
    },
  };
//=============================================================================
$(document).ready(function() {
  /*
  Get query parameters
  --------------------
  */
  try { // use query params (if any) in <script> src attribute to update _params:
    var query_params=
      $('script[src*=jsmob\\.js\\?]').attr('src').match(/[^?=&]+=[^&=]+/g);
      // double-escape above: needed for jQuery to recognize expression
    for(var i in query_params) {
      var param=query_params[i].match(/^(.+)=(.+)$/);
      if(typeof _params[param[1]]!='undefined') {
        var value=typeof _params[param[1]]=='number'?parseInt(param[2]):param[2];
        _params[param[1]]=value;
      }
    }
  } catch(e) {
    // no query params defined
  }
  /*** special test feature ***/
    // remove webtools-based shell, but ONLY AFTER getting params
    $('#js_hidden_part').add($('#js_hidden_part').siblings('script,noscript'))
      .remove();
  /* ************************ */
  /*
  Prepare constants (don't use "var", so they will be global)
  -----------------
  */
  PREFIX=_params.prefix;
  // escape any non-standard character for jQuery selectors:
  safePREFIX=PREFIX.replace(/([^-_0-9A-Za-z])/g,'\\$1');
  /* escape any non-standard character for RegExp:
  Each prefix character is embedded in a class (e.g. "abc" becomes "[a][b][c]"),
  so we have only to escape significant characters inside this context.
  */
  regPREFIX='';
  for(var i=0,n=PREFIX.length;i<n;i++) {
    regPREFIX+='['+PREFIX[i].replace(/([\^\]\-\\])/,'\\$1')+']';
  }
  var evals='';
  for(var i in _constants) {
    var name=_constants[i];
    var cName=name.toUpperCase();
    evals+=cName+'=PREFIX+"'+name+'";jq'+cName+'="."+safePREFIX+"'+name+'";';
  }
  eval(evals);
   /*
  Set final default values
  ------------------------
  1. generic values are hard-coded in "_params" object
  2. a query parameter supersedes the corresponding generic value (available
     for all params)
  3. a %class in <body> supersedes any value above (only %Break_X and %Width_X
     are allowed)
  */
  getDims(document.getElementsByTagName('body')[0],_params);
  // resume configuration:
  if(_params.debug) {
    consoleGroup('Configuration',_params);
  }
  /*
  Launch analysis delayed, for CSS to be fully executed first
  -----------------------------------------------------------
  */
  setTimeout(process,_params.cssTimeout);
});
//=============================================================================
var process= function() { /*
    -------
*/
  /*
  Preprocess menus (%Menu)
  -----------------------------------------------------------------------------
  Menus are preprocessed first, since they may become also blocks, and so must
  then be processed as blocks too.
  */
  $(jqMENU).each(function(i) {
    // ensure this %Menu is embedded in a %Block, or set %Block itself:
    if(!$(this).closest(jqBLOCK).length) {
      $(this).addClass(BLOCK);
    }
  });
  /*
  Process blocks (%Block)
  -----------------------------------------------------------------------------
  First looks for .%Block elements in the entire document.
  For each block found, looks for contained .%Col elements, and uses the other
  ".%…" classes to register columns characteristics.
  Then generates the appropriate base CSS and finally activates the responsive
  mechanism.
  */
  /*
  Get given characteristics
  --------------------------*/
  $(jqBLOCK).each(function() {
    // create reference for this block:
    var block=createEntity(this,'Block');
    getDims(this,block);
    if($(this).hasClass(AUTO)) {
      block.autoMargins=true;
    }
    // look for contained cols:
    $(jqCOL,this).each(function(i) {
      // create reference for this col (from HTML classes):
      var col=createEntity(this,'Col');
      getDims(this,col);
      block.colsWidth+=col.baseWidth;
      if($(this).hasClass(FIXED)) {
        col.fixed=true;
        block.fixedWidth+=col.baseWidth;
      }
      // unset specified margins if Auto in block:
      if(block.autoMargins) {
        col.leftMargin=0;
        col.rightMargin=0;
      }
      // if rank not defined, use HTML order:
      col.rank=col.rank?(col.rank-1):i; 
      // save width adjustments (from CSS):
      col.outWidth= // (returned values may be fractional)
        Math.round(parseFloat($(this).css('borderLeftWidth')))+
        Math.round(parseFloat($(this).css('borderRightWidth')))+
        Math.round(parseFloat($(this).css('paddingLeft')))+
        Math.round(parseFloat($(this).css('paddingRight')));
      // register this col in HTML sequence order, regardless of rank:
      block.cols.push(col);
    });
    // finally register block, and its breakpoint:
    _blocks.push(block);
    /*
    if(typeof _breakPoints[block.breakPoint]=='undefined') {
      _breakPoints[block.breakPoint]=[];
    }
    _breakPoints[block.breakPoint].push(block.id);
    */
  });
  /*
  Set fixed constraints
  ----------------------*/
  if(_blocks.length) {
    /*
    Ensure viewport to report its real pixels width */
    if(!$('meta[name=viewport]').length) {
      $('head').append('\
<meta name="viewport" content="width=device-width">\
      ');
    }
    /*
    Compute parts, generate CSS */
    var fullCSS=baseCSS();
    for(var blockNo in _blocks) {
      block=_blocks[blockNo];
      // generate base CSS for this block:
      fullCSS+=blockCSS(block);
      // compute whole-block depending data:
      var availWidth=block.baseWidth-block.fixedWidth;
      var stdMarginWidth=0;
      if(block.autoMargins) {
        var freeSpace=block.baseWidth-block.colsWidth;
        var intervals=block.cols.length-1;
        var stdMarginWidth=Math.floor(freeSpace/intervals);
        freeSpace-=stdMarginWidth*intervals;
      }
      for(var colNo in block.cols) {
        var col=block.cols[colNo];
        // generate base CSS for this col:
        //fullCSS+=colCSS(col);
        // compute independant col depending data:
        if(!col.fixed) {
          // variable col, compute its fraction of available not-fixed space:
          col.ownPart=col.baseWidth/availWidth;
        }
        // set auto-computed margins, if required (always right, but last one):
        if(block.autoMargins && colNo<block.cols.length-1) {
          col.rightMargin=stdMarginWidth;
          if(freeSpace) {
            // adjust by +1px while needed:
            col.rightMargin++;
            freeSpace--;
          }
        }
        // even for fixed cols, margins do vary:
        col.LMPart=col.leftMargin/availWidth;
        col.RMPart=col.rightMargin/availWidth;
        // ensure to drop any whitespace before element (inline-block):
        fixTag(block,col);
      }
    }
    // finally set CSS:
    $('head').append('<style>'+fullCSS+'<\/style>');
    /*
    Prepare live display indicators, if required */
    if(_params.liveshow) {
      createLWD($('body'),'body');
      for(var blockNo in _blocks) {
        createLWD($('#'+_blocks[blockNo].id),'block',{blockNo:blockNo});
        for(var colNo in _blocks[blockNo].cols) {
          createLWD($('#'+_blocks[blockNo].cols[colNo].id),'col',
            {blockNo:blockNo,colNo:colNo});
        }
      }
    }
  }
  /*
  Process menus (%Menu)
  -----------------------------------------------------------------------------
  At the opposite of their preprocess (see above), menus have to be finally
  processed AFTER blocks, since:
  . a DDT is embedded in every submenu, with a click event bound
  . during blocks processing the DOM is modified around cols
  . so if a menu resides in the modified part, its DDT's would lose their events
  */
  var main=false;
  $(jqMENU).each(function(i) {
    /* In the scope of a given %Menu, the 1st encountered <ul> is seen as the
      menu (the %Menu wrapper should not contain any other 1st level <ul>) */
    var rootUl=$(this).is('ul')?$(this):$(this).find('ul:first');
    rootUl.addClass(ROOTMENU); // (to simplify CSS specifs addressing)
    if($(this).hasClass(MAIN)) {
      if(main) { // a main menu has been already defined, deny this one
        console.warn(
          '%Menu%Main defined more than once, toggled to simple menu');
      } else { // create a main-nav toggle button for this menu
        main=true;
        var parentBlock=$(this).closest(jqBLOCK)[0];
        enforceId(parentBlock);
        createMNT(rootUl[0],parentBlock.id);
      }
    }
    rootUl.find('ul').each(function() { // (only 2 levels are allowed ***)
      $(this).addClass(SUBMENU); // will be hidden when %Stack, unless %Open
      createDDT($(this).prev(/* should be <div> or <a> */));
    });
  });
   /*
  Process images (%Zoom)
  -----------------------------------------------------------------------------
  Looks for %Zoom elements: each one may be <img> itself, or contain <img>'s.
  All these <img>'s will be processed.
  */
  $(jqZOOM).each(function() {
    var prepare_img=function(target) {
      var image={baseWidth:target.naturalWidth}; // *** TBR for IE7/8
      //*** http://www.jacklmoore.com/notes/naturalwidth-and-naturalheight-in-ie/
      getDims(target,image); // use given %Width_X, if any
      $(target).css({maxWidth:image.baseWidth});
      if(_params.liveshow) {
        enforceId(target);
        createLWD($(target),'zoom');
      }
    };
    if(this.tagName=='IMG') {
      prepare_img(this);
    } else { // %Zoom is set at a wrapper level
      $('img',this).each(function() {
        prepare_img(this)
      });
    }
  });
/*
  Resume structure
  -----------------------------------------------------------------------------
  */
   if(_params.debug) {
    consoleGroup('Found '+_blocks.length+' block(s)',_blocks)
  }
/*
  Bind responsive mechanism
  -----------------------------------------------------------------------------
  */
  $(window).resize(windowResize);
  $(document).scroll(liveWidthDisplay);
  // wait for CSS init, or false dims computation:
  setTimeout('$(window).resize()',_params.cssTimeout);
}
//=============================================================================
var baseCSS= function() { /*
    -------
*/
  var CSS='\
/*\n\
Blocks and Cols defaults: FULL LAYOUT\n\
--------------------------------------*/\n\
img'+jqZOOM+', '+jqZOOM+' img {\n\
  width: 100% !important; /* supersedes any existing width definition */\n\
}\n\
'+jqBLOCK+'>img'+jqZOOM+', '+jqBLOCK+jqZOOM+'>img {\n\
  display: block !important; /* when <img>\'s parent has position:relative */\n\
}\n\
'+jqBLOCK+' {\n\
  margin: 0 auto !important;\n\
  position: relative !important;\n\
  float: none !important;\n\
  width: 100% !important; /* supersedes any existing width definition */\n\
}\n\
'+jqBLOCK+' '+jqCOL+' {\n\
  /* redundant: avoids addressing lonely '+jqCOL+'\'s, if any */\n\
  position: relative !important;\n\
  float: none !important;\n\
  display: inline-block !important;\n\
  vertical-align: top !important;\n\
}\n\
/*\n\
Blocks and Cols: REDUCED LAYOUT\n\
-------------------------------*/\n\
'+jqSTACK+' '+jqCOL+' {\n\
  display: block !important;\n\
  left: 0 !important;\n\
  width: 100% !important;\n\
  /* don\'t consume horizontal space: */\n\
  margin-left: 0 !important;\n\
  margin-right: 0 !important;\n\
  border-left-width: 0 !important;\n\
  border-right-width: 0 !important;\n\
  padding-left: 0 !important;\n\
  padding-right: 0 !important;\n\
  /* don\'t leave vertical space unused: */\n\
  min-height: 0 !important;\n\
}\n\
/*\n\
Menus: REDUCED LAYOUT\n\
----------------------*/\n\
'+jqMNT+' {\n\
  position: fixed;\n\
  right: 7px;\n\
  top: 7px;\n\
  border-radius: 4px;\n\
  /* box-shadow: 5px 5px 2px #888; */\n\
  background-color: #333;\n\
  padding: 8px;\n\
  color: #fff;\n\
  font-size: x-large;\n\
  font-weight: bold;\n\
  z-index: 99999;\n\
  cursor: pointer;\n\
}\n\
'+jqMNT+jqACTIVE+' {\n\
  box-shadow: 1px 1px 2px #000 inset;\n\
  background-color: #eee;\n\
  color: #444;\n\
}\n\
/* For DDT button, thanks to https://drupal.org/project/rubix-responsive-theme */\n\
'+jqDDT+' {\n\
  background: none repeat scroll 0 0 #555 !important;\n\
  border: 5px solid #888 !important;\n\
  border-radius: 15px !important;\n\
  height: 20px !important;\n\
  position: absolute !important;\n\
  left: 5px !important;\n\
  top: 2px !important;\n\
  width: 20px !important;\n\
  z-index: 9999;\n\
  cursor: pointer;\n\
}\n\
'+jqDDT+'>span {\n\
  border-left: 5px solid rgba(0, 0, 0, 0) !important;\n\
  border-right: 5px solid rgba(0, 0, 0, 0) !important;\n\
  border-top: 5px solid #aaa !important;\n\
  display: block !important;\n\
  height: 0 !important;\n\
  margin: 8px 0 0 5px !important;\n\
  width: 0 !important;\n\
}\n\
/*\n\
When %Stack, all %Menu components (%Rootmenu, %Submenu and their embedded\n\
<li>, <div> and <a>) must remain independant of the original CSS */\n\
'+jqSTACK+' '+jqROOTMENU+', '+jqSTACK+jqROOTMENU+', '+jqSTACK+' '+jqSUBMENU+',\n\
'+jqSTACK+' '+jqROOTMENU+' li, '+jqSTACK+jqROOTMENU+' li {\n\
  float: none !important;\n\
  position: static !important;\n\
  width: inherit !important;\n\
  margin: 0 !important;\n\
  padding: 0 !important;\n\
}\n\
/*\n\
Set <div> and <a> hard-fixed dims, ensuring a correct positioning of DDT\'s */\n\
'+jqSTACK+' '+jqROOTMENU+' div, '+jqSTACK+jqROOTMENU+' div,\n\
'+jqSTACK+' '+jqROOTMENU+' a, '+jqSTACK+jqROOTMENU+' a {\n\
  margin: 0 !important;\n\
  height: 11px !important;\n\
  padding: 12px 0 12px 40px !important;\n\
  font-size: 11px !important;\n\
}\n\
'+jqSTACK+' '+jqSUBMENU+' {\n\
  display: none !important;\n\
  /* supersedes native "ul li:hover ul {display: block}" */\n\
}\n\
'+jqSTACK+' '+jqSUBMENU+jqOPEN+' {\n\
  display: block !important;\n\
}\n\
'+jqSTACK+' '+jqDDT+' {\n\
  display: inline !important;\n\
}\n\
/*\n\
Anything %Opt: REDUCED LAYOUT\n\
------------------------------\n\
>>> KEEP this specification LAST! (must supersede any other one) */\n\
'+jqSTACK+' '+jqOPT+','+jqSTACK+jqOPT+',\n\
'+jqSTACK+' '+jqOPT+' img,'+jqSTACK+jqOPT+' img,'+jqSTACK+' img'+jqOPT+' {\n\
  display: none !important;\n\
}\n';
  if(_params.liveshow) {
    CSS+='\
/*\n\
Live indicators (when liveshow=1)\n\
----------------------------------*/\n\
'+jqLWD+' {\n\
  position: fixed;\n\
  border-radius: 3px;\n\
  background-color: #f66;\n\
  color: #fff;\n\
  font-weight: bold;\n\
  padding: .2em .5em;\n\
  opacity: .7;\n\
  z-index: 9999;\n\
}\n\
'+jqLWD+' span {\n\
  color: #444;\n\
  font-weight: bold;\n\
}\n\
#\\'+LWD+' {\n\
  position: fixed;\n\
  border-radius: 5px;\n\
  background-color: #ffc;\n\
  padding: 0 1em;\n\
  z-index: 999;\n\
}\n\
#\\'+LWD+' * {\n\
  font-family: "Courier New";\n\
}\n';
}
  if(!_params.vscroll) {
    CSS+='\
/*\n\
Hide vertical scroll bar (when vscroll=0)\n\
------------------------------------------*/\n\
body {\n\
  overflow: hidden; /* simulate mobile device */\n\
}\n';
  }
  CSS+='\
/*\n\
Individual defaults for full layout\n\
-----------------------------------*/\n';
  return CSS;
}
//=============================================================================
var blockCSS= function(block) { /*
    ---------
Note that, in most cases, this specification may be redundant for several blocks.
It is intended to allow defining different breakPoint's for different blocks.
*/
  return '\
#'+block.id+' {\n\
  max-width: '+block.baseWidth+'px !important;\n\
}\n';
}
//=============================================================================
var colCSS= function(col) { /* obsolete
    ------
*/
  return '\
#'+col.id+' {\n\
  width: 50px; /* to temporarily supersede any #... specification */\n\
}\n';
}
//=============================================================================
var consoleGroup= function(title,data) { /*
    ------------
*/
  if(!window.console) {
    return;
  }
  if(arguments.length<2) { // title not provided, will omit grouping
    data=title;
    title='';
  }
  if(title) {
    console.group(title);
  }
  switch(typeof data) {
    case 'object':
      if($.isArray(data)) {
        console.table(data);
      } else {
        console.dir(data);
      }
      break;
    default:
      console.info(data);
  }
  if(title) {
    console.groupEnd();
  }
}
//=============================================================================
var createDDT= function($element) { /*
    ---------
Creates a drop-down toggle button embedded into element.
*/
  $element.css({position:'relative'}) // (relative: since DDT pos is absolute)
  .append(
    $('<span \/>').addClass(DDT)
    .css({display:'none',})
    .append($('<span \/>'))
    // when click, toggle submenu:
    .click(function(event) {
      // hide or show current %Submenu:
      var submenu=$(event.target).closest('li').find(jqSUBMENU);
      submenu.toggleClass(OPEN);
      // hide any other %Open %Submenu:
      $(jqOPEN).not(submenu).removeClass(OPEN);
      setTimeout(liveWidthDisplay,_params.cssTimeout); // adjust LWD's position
      return false; // avoid following link, if embedded in <a>
    })
  );
}
//=============================================================================
var createEntity= function(element,template) { /*
    ------------
Sets element.id if not yet, and returns a new object based on template.
*/
  enforceId(element);
  return new _templates[template](element);
}
//=============================================================================
var createLWD= function(target,ident,ref) { /*
    ---------
Creates a Live Width Display <div> associated to target, which will real-time:
. follow the position of the target
. display the target width
In addition, if "ref" is defined, click event is binded to liveDetails(), using
ref data, which should look like {blockNo,colNo}
*/
  // create a global container, if not yet:
  // (avoids Firebug consuming time for display when modifying window size)
  if(!$('#'+safePREFIX+safePREFIX).length) {
    $('body').append($('<div \/>').attr('id',PREFIX+PREFIX));
  }
  // create the LWD itself (id: %<target.id>, class: %LWD):
  var lwd=$('<div \/>').appendTo($('#'+safePREFIX+safePREFIX));
  lwd
    .addClass(LWD)
    .css({cursor:(ref?'pointer':'help')})
    .html(ident+' <span \/>') // (place holder for target current size)
    .attr({
      id:           PREFIX+target[0].id,
      'data-ident': ident,
      title:        function() {
        with(target[0]) {
          var classes=className.match(new RegExp(regPREFIX+'[^ ]+','g'));
          return (tagName+(!!classes?('#'+id+'.'+classes.join(' ')):''));
        }
      }
    });
  // link target to its jsmob definition, if required:
  if(ref) {
    target.attr({'data-block':ref.blockNo,'data-col':ref.colNo});
    lwd.click(liveDetails);
  }
}
//=============================================================================
var createMNT= function(ul,parentBlockId) { /*
    ---------
Creates a main-nav toggle button (position fixed).
 */
 enforceId(ul); // ensure ul has an id
  $('body').append(
    $('<div \/>')
    .addClass(MNT).html('&#9776;').css({display:'none'})
    .attr({'data-menu':ul.id,'data-block':parentBlockId})
    // when click, toggle menu:
    .click(function(event) {
      $(jqMENU+jqMAIN).toggle();
      $(event.target).toggleClass(ACTIVE);
      if($(event.target).hasClass(ACTIVE)) {
        window.scrollTo(0,0); // back to menu
      } else {
        $(jqOPEN).removeClass(OPEN); // hide any %Submenu
      }
      setTimeout(liveWidthDisplay,_params.cssTimeout); // adjust LWD's position
    })
  );
}
//=============================================================================
var debug= function(block,title) { /* obsolete
    =====
*/
  var data=[];
  $('#'+block.id+' .\\%Col').each(function() {
    data.push({
      id:this.id,
      posTop:$(this).position().top,
      posLeft:$(this).position().left
        -Math.round(parseFloat(getComputedStyle(this).left)),
      outWidth:$(this).outerWidth(true),
    });
  });
  consoleGroup(title+' (inWidth:'+$('#'+block.id).innerWidth()+')',data);
}
//=============================================================================
var enforceId= function(element) { /*
    ---------
*/
  if(!element.id) { // affect a unique id, if not yet
    element.id=ID+(++_uniqueid);
  }
}
//=============================================================================
var fixTag= function(block,col) { /*
    ------
Drops any white-space(s) before col-element.
*/
  var tag=document.getElementById(col.id).outerHTML.match(/^<[^>]+>/)[0];
  var parent=document.getElementById(block.id);
  parent.innerHTML=parent.innerHTML.replace(
    new RegExp('(^|>)[ \n\r\t]+'+tag),'$1'+tag);
}
//=============================================================================
var getDims= function(element,object) { /*
    -------
Extracts dim classes from element, then for each one:
. looks for classid and dim from "%<classid>_<dim>" (also accepted are
  "%<classid>-<dim>" and "%<classid><dim>")
. affects dim to object.propid through map (classid:propid)
*/
  var dims=element.className.match(new RegExp(regPREFIX+'[a-z]+[-_]?\\d+','gi'));
  for(var i in dims) {
    var matches=dims[i].match(new RegExp(regPREFIX+'(.+)_(.+)'));
    var classid=_classMap[matches[1]];
    if(typeof classid!='undefined') {
      object[classid]=+matches[2]; // ("+" casts to int)
    } else {
      if(_params.debug) {
        console.warn('Unknown classid "'+matches[1]+
          '" in class "'+dims[i]+'" of element "#'+element.id+'"');
      }
    }
  }
}
//=============================================================================
var liveDetails= function() { /*
    -----------
*/
  $('#\\'+LWD).remove();
  // display panel with LWD element title:
  var panel=$('<div \/>').appendTo($('#'+safePREFIX+safePREFIX));
  panel.attr('id',LWD)
    .css({
      top:($(this).position().top+$(this).outerHeight())+'px',
      left:$(this).position().left+'px'
    })
    .append('<p>'+this.title+'<\/p><hr />')
    .click(function() {$('#\\'+LWD).remove();});
  // display detailed information depending on target type:
  var target=document.getElementById(this.id.substr(1));
  var block=_blocks[target.dataset['block']];
  switch(type=this.innerHTML.match(/^([^ ]+) /)[1]) {
    case 'block':
      data=
        JSON.stringify(block,function(k,v){return (k=='cols'?undefined:v);},2);
      break;
    case 'col':
      var col=block.cols[target.dataset['col']];
      data=JSON.stringify(col,null,2);
      break;
  }
  panel.append($('<pre />').html(data));
}
//=============================================================================
var liveWidthDisplay= function() { /*
    ----------------
*/
  if(_params.liveshow) {
    $(jqLWD).each(function() {
      // get target id from LWD id (%<target.id>):
      var target=$(document.getElementById(this.id.substr(1)));
      // (don't use jQuery('#id'): avoids looking for special chars)
      if(!target.length) {
        target=$('body');
      }
      $(this).toggle(target.is(':visible'));
      $(this).find('span').html(target.outerWidth());
      switch(this.dataset.ident) {
        case 'body': // top/center
          $(this).css({top:0,left:'50%'});
          break;
        case 'block': // top/right
          $(this).offset({
            top:target[0].offsetTop,
            left:target[0].offsetLeft+target.outerWidth()-$(this).outerWidth(),
          });
          break;
        case 'col': // top/left
          $(this).offset(target.offset());
          break;
        case 'zoom': // center/center
          $(this).offset({
            top:target.offset().top
              +(target.outerHeight()-$(this).outerHeight())/2,
            left:target.offset().left
              +(target.outerWidth()-$(this).outerWidth())/2,
          });
          break;
      }
    });
  }
}
//=============================================================================
var windowResize= function() { /*
    ------------
For each registered block, compute cols width and position depending on the
current viewport characteristics.
Then for main %Menu, hide/displays MNT depending on situation against breakpoint.
*/
  var winWidth=$('body').innerWidth();
  /*
  Process blocks and cols
  -----------------------------------------------------------------------------
  */
  for(var i in _blocks) {
    var block=_blocks[i];
    if(winWidth<=block.breakPoint) {
      // reduced layout, simply add %Stack class to this block:
      $('#'+block.id).addClass(STACK);
      continue;
    }
    // otherwise full layout, remove %Stack class:
    $('#'+block.id).removeClass(STACK)
    if(!block.cols.length) {
      continue;
    }
    /*
    Compute cols widths and margins (travel in native order)
    ---------------------------------------------------------*/
    var rankOrder=[];
    var freeWidth=Math.min(winWidth,block.baseWidth);
    var availWidth=freeWidth-block.fixedWidth;
    // compute widths, based on cols ownPart:
    for(var j in block.cols) {
      var col=block.cols[j];
      // populate rank order list:
      rankOrder[col.rank]=j;
      // compute col widths:
      col.curWidth=
        col.fixed?col.baseWidth:Math.round((col.ownPart*availWidth));
      col.curLM=Math.round(col.LMPart*availWidth);
      col.curRM=Math.round(col.RMPart*availWidth);
      // update consumed width:
      freeWidth-=(col.curWidth+col.curLM+col.curRM);
    }
    // adjust widths if needed, due to roundings:
    while(freeWidth<0) {
      /* Subtract 1px to each not fixed col, till ok; if finally not sufficient,
         start again from first col */
      for(var j in block.cols) {
        col=block.cols[j];
        if(!col.fixed) {
          col.curWidth--;
          freeWidth++;
        }
        if(freeWidth==0) {
          break;
        }
      }
    }
    /*
    Compute left positions, set individual CSS (travel in rank order)
    -----------------------------------------------------------------*/
    var curShift=0, left;
    for(var displayRank in rankOrder) {
      var nativeRank=rankOrder[displayRank];
      col=block.cols[nativeRank];
      if(nativeRank>displayRank) {
        // must right-shift col by sum(previous cols in native order):
        left=0;
        while(nativeRank>0) {
          with(block.cols[--nativeRank]) {
            left-=(curWidth+curLM+curRM);
          }
        };
        curShift+=col.curWidth;
      } else {
        // left-shift col by already right-shifted ones:
        left=curShift;
      }
      /*
      if(_params.debug) {
        debug(block,'before col '+col.id);
      }
      */
      $('#'+col.id)
        .css({ // set element.style
          //top:          0,
          left:         left+'px',
          width:        (col.curWidth-col.outWidth)+'px',
          marginLeft:   col.curLM+'px',
          marginRight:  col.curRM+'px',
        });
    }
    /*
    if(_params.debug) {
      debug(block,'after col '+col.id);
    }
    */
  }
  /*
  Process menus
  -----------------------------------------------------------------------------
  When %Menu%Main's block has become %Stack, displays the main-nav toggle
  button, and hides menu when MNT button not open.
  Other %Menu's: simply handled by CSS.
  */
  try {
    var stack=$('#\\'+$(jqMNT).data('block')).hasClass(STACK);
    $(jqMNT).toggle(stack);
    $('#\\'+$(jqMNT).data('menu')).parent()
      // use parent, since <ul> itself may keep height>0 when display:none!
      .toggle(!stack || $(jqMNT).hasClass(ACTIVE));
  } catch(e) {
    // no MNT created
  }
  /*
  Live display elements sizes, if required
  -----------------------------------------*/
  setTimeout(liveWidthDisplay,_params.cssTimeout); // adjust LWD's position
}
//=============================================================================
}())
//=============================================================================

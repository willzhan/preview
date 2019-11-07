let uglify = require('uglify-js');
let fs = require('fs');

let dir = 'src/';
let outdir = dir + 'static/';
let outfile = outdir + 'bundle.min.js';
let omit = ['ampPlayer.js'];


/**
 * Minify source
 */
function minifySrc() {
  // bundle and minify all non-omitted source files 
  fs.readdir(dir, (err, filenames) => {
    if (err) {
      console.log(err);
    }
    let filemap = {};
    filenames.forEach(filename => {
      // don't try to read directories
      if (!fs.lstatSync(dir + filename).isDirectory() && !omit.includes(filename)) {
        filemap[filename] = fs.readFileSync(dir + filename, 'utf8')
      }
    });
    console.log(uglify.minify(filemap))
    //fs.writeFileSync(outfile, uglify.minify(filemap).code, 'utf8');
  });
}

minifySrc(dir);

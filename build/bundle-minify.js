let uglify = require('uglify-js');
let fs = require('fs');

let dir = process.cwd().replace('/build', '') + '/src/';
let outdir = dir + 'static/js/';
let bundlefile = outdir + 'bundle.min.js';
let omit = ['ampPlayer.js'];

/**
 * Minify source
 */
function minifySrc() {
  fs.readdir(dir, (err, filenames) => {
    if (err) {
      console.log(err);
    }
    let filemap = {};
    filenames.forEach(filename => {
      // don't try to read directories
      // don't read omitted files
      if (!fs.lstatSync(dir + filename).isDirectory() && !omit.includes(filename)) {
        filemap[filename] = fs.readFileSync(dir + filename, 'utf8')
      }
    });
    // bundle and minify all non-omitted source files
    fs.writeFileSync(bundlefile, uglify.minify(filemap).code, 'utf8');
  });
  omit.forEach(filename => {
    // minify bundle omitted source files
    fileobj = { filename: fs.readFileSync(dir + filename, 'utf8') };
    let outfile = outdir + filename.replace(".js", ".min.js");
    fs.writeFileSync(outfile, uglify.minify(fileobj).code, 'utf8');
  });
}

minifySrc(dir);

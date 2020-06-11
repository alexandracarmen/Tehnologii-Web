const freeFiles = [
  '/login.html',
  '/oglinda.png',
  '/favicon.ico'
];


const mimeTypes = [
  {
    extension: 'html',
    folder: 'html',
    mimeType: 'text/html'
  },
  {
    extension: 'jpg',
    folder: 'images',
    mimeType: 'image/jpeg'
  },
  {
    extension: 'png',
    folder: 'images',
    mimeType: 'image/png'
  },
  {
    extension: 'ico',
    folder: 'images',
    mimeType: 'image/x-icon'
  }
];


module.exports = {
  freeFiles,
  mimeTypes
};
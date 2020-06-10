const permission = async (req, res, roles) => {
  return new Promise((success, reject) => {
    if (!roles.includes(req.user.type.toLowerCase())) {
      res.statusCode = 401;
      res.end('Not authorized to access this resource');
      return;
    }
    success();
  });
};

module.exports = {
  permission
};
const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');

const { mailtrap, mail } = require('../../config');

const send = (options) => {
  return new Promise((success, reject) => {

    const env = process.env.NODE_ENV || "development";
    const generalTransport = nodemailer.createTransport(mailtrap);

    generalTransport.sendMail(options, (err, info) => {
      if (err) {
        console.errr(err);
        reject(err);
      } else {
        success(info);
      }
    });
  });
};


const sendEmailTemplate = (mailOptions, contentOptions) => {
  return new Promise((success, reject) => {
    ejs.renderFile(
      contentOptions.path,
      contentOptions.parameters,
      async (err, data) => {
        if (err) {
          return reject(err);
        }
        await send({...mailOptions, html: data});
      })
  });
};


const sendInvite = (to, acceptInvitationLink, groupName) => {
  sendEmailTemplate({
    from: mail.defaultFrom,
    to: to,
    subject: `Invite to group ${groupName} on Food Organizer`
  }, {
    path: path.resolve(__dirname, '../templates/emails/sendInvitation.ejs'),
    parameters: {
      link: acceptInvitationLink,
      groupName: groupName
    }
  });
};


module.exports = sendInvite;
// Email templates for SkillSwap notifications

export const enrollmentEmail = ({ userName, courseTitle, courseUrl }) => ({
  subject: `You're enrolled in ${courseTitle}!`,
  html: `<p>Hi ${userName},</p><p>You've successfully enrolled in <b>${courseTitle}</b>.<br>Start learning: <a href="${courseUrl}">${courseUrl}</a></p>`
});

export const exchangeStatusEmail = ({ userName, status, skill, exchangeUrl }) => ({
  subject: `Skill Exchange Update: ${status}`,
  html: `<p>Hi ${userName},</p><p>Your skill exchange for <b>${skill}</b> is now <b>${status}</b>.<br>See details: <a href="${exchangeUrl}">${exchangeUrl}</a></p>`
});

export const adminAnnouncementEmail = ({ userName, message }) => ({
  subject: 'Announcement from SkillSwap Team',
  html: `<p>Hi ${userName},</p><p>${message}</p>`
});

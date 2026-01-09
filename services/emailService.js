let nodemailer;
let transporter = null;

try {
  nodemailer = require('nodemailer');
  // Configuration du transporteur email (à personnaliser selon ton fournisseur)
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
} catch (err) {
  console.warn('⚠️ Nodemailer non installé. Emails désactivés. Installez avec: npm install nodemailer');
}

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
const sendResetPasswordEmail = async (email, resetToken, user) => {
  try {
    if (!transporter) {
      console.log('📧 (Simulation) Email de reset envoyé à:', email, 'Token:', resetToken.substring(0, 10) + '...');
      return true;
    }
    
    // URL du frontend pour réinitialiser le mot de passe
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Réinitialisation de mot de passe</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${user.fullName}</strong>,</p>
            
            <p>Vous avez demandé une réinitialisation de mot de passe. Cliquez sur le lien ci-dessous pour continuer:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #666; font-size: 12px;">
              Ou copiez ce lien: <br/>
              <code style="background: #eee; padding: 5px; border-radius: 3px; word-break: break-all;">${resetLink}</code>
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">
              <strong>Attention:</strong> Ce lien expire dans 15 minutes.<br/>
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé à:', email);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du email:', error);
    return false;
  }
};

/**
 * Envoyer un email de bienvenue pour les livreurs
 */
const sendDeliveryWelcomeEmail = async (email, user) => {
  try {
    if (!transporter) {
      console.log('📧 (Simulation) Email de bienvenue livreur envoyé à:', email);
      return true;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Bienvenue dans notre plateforme de livraison',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #00d2fc 0%, #3677ff 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">🚚 Bienvenue Livreur</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${user.fullName}</strong>,</p>
            
            <p>Votre compte livreur a été créé avec succès! En attente de vérification par un administrateur.</p>
            
            <h3>Prochaines étapes:</h3>
            <ol>
              <li>Complétez votre profil (plaque d'immatriculation, type de véhicule)</li>
              <li>Attendez la vérification par notre équipe (24-48h)</li>
              <li>Commencez à livrer des commandes</li>
            </ol>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #666; font-size: 13px;">
              Questions? Contactez notre support: <strong>support@restaurant.app</strong>
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email de bienvenue livreur envoyé à:', email);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du email:', error);
    return false;
  }
};

/**
 * Envoyer un email de confirmation de commande
 */
const sendOrderConfirmationEmail = async (email, order, user) => {
  try {
    if (!transporter) {
      console.log('📧 (Simulation) Email de confirmation de commande envoyé à:', email);
      return true;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `Commande confirmée #${order._id.toString().substring(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">✅ Commande Confirmée</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
            <p>Bonjour <strong>${user.fullName}</strong>,</p>
            
            <p>Votre commande a bien été enregistrée.</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
              <p><strong>N° Commande:</strong> #${order._id.toString().substring(0, 8)}</p>
              <p><strong>Contenu:</strong> ${order.description}</p>
              <p><strong>Adresse de livraison:</strong> ${order.deliveryAddress}</p>
              <p><strong>Statut:</strong> ${order.status}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #666; font-size: 13px;">
              Vous recevrez une notification dès qu'un livreur sera assigné à votre commande.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmation de commande envoyé à:', email);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du email:', error);
    return false;
  }
};

module.exports = {
  sendResetPasswordEmail,
  sendDeliveryWelcomeEmail,
  sendOrderConfirmationEmail,
};

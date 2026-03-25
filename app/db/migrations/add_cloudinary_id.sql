-- Ajoute la colonne cloudinary_id à news_images
-- Nécessaire pour supprimer les images sur Cloudinary lors de la suppression d'un article ou d'une image
ALTER TABLE news_images ADD COLUMN IF NOT EXISTS cloudinary_id text;

CREATE TABLE project (
    id INT PRIMARY KEY auto_increment,
    code VARCHAR(5) NOT NULL,
    name VARCHAR(20) NOT NULL,
    state INT NOT NULL DEFAULT 1
);

INSERT INTO project (id, code, name) VALUES (1, 'COSHP', 'COSMASHOP');
INSERT INTO project (id, code, name) VALUES (2, 'COSPA', 'COSMA-PARFUMERIE');
INSERT INTO project (id, code, name) VALUES (3, 'DIGIP', 'DIGIPARF');

CREATE TABLE label (
    id INT PRIMARY KEY auto_increment,
    name VARCHAR(45) NOT NULL,
    state INT NOT NULL DEFAULT 1
);

INSERT INTO label (id, name) VALUES (1, 'Suivi de commande');
INSERT INTO label (id, name) VALUES (2, 'Colis non recu');
INSERT INTO label (id, name) VALUES (3, 'Paiement / Facture non recu');
INSERT INTO label (id, name) VALUES (4, 'Produit defectueux');
INSERT INTO label (id, name) VALUES (5, 'Retour produit et retractation');

CREATE TABLE role (
    name VARCHAR(20) PRIMARY KEY,
    state INT NOT NULL DEFAULT 1
);

INSERT INTO role (name) VALUES ('super_admin');

CREATE TABLE permission (
    id INT PRIMARY KEY auto_increment,
    role VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,
    project_id INT NOT NULL,
    label_id INT NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'inactive',
    state INT NOT NULL DEFAULT 1
);

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 1, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 1, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 1, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 1, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 1, 5, 'active');

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 1, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 1, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 1, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 1, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 1, 5, 'active');

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 1, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 1, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 1, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 1, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 1, 5, 'active');

-- --------------

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 2, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 2, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 2, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 2, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 2, 5, 'active');

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 2, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 2, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 2, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 2, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 2, 5, 'active');

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 2, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 2, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 2, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 2, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 2, 5, 'active');

-- --------------

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 3, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 3, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 3, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 3, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Lecture de ticket', 3, 5, 'active');

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 3, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 3, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 3, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 3, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Mise a jour ticket', 3, 5, 'active');

INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 3, 1, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 3, 2, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 3, 3, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 3, 4, 'active');
INSERT INTO permission (role, action, project_id, label_id, status) VALUES ('super_admin', 'Repondre au couriel', 3, 5, 'active');

-- ------------

CREATE TABLE user (
    id INT PRIMARY KEY auto_increment,
    name VARCHAR(45) NOT NULL,
    email VARCHAR(45) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    state INT NOT NULL DEFAULT 1
);

INSERT INTO user (id, name, email, password, role) VALUES (1, 'RAJAONAH Hary Ny Aina', 'hrajaonah@astucom.com', '$2a$12$UMlbOA6qqNPBEtStGo8vY.wWlFevPiB4bwBBg8D2nLm4NgyYa1WzS', 'super_admin');

CREATE TABLE ticket (
    id INT PRIMARY KEY auto_increment,
    num_ticket VARCHAR(45) NOT NULL,
    subject_ticket VARCHAR(255) NOT NULL,
    conversation_email_id TEXT NOT NULL,
    to_do TEXT NOT NULL,
    original_client_mail VARCHAR(45) NOT NULL,
    reception_mail VARCHAR(45) NOT NULL
    nom_client VARCHAR(45) DEFAULT NULL,
    num_commande VARCHAR(45) NOT NULL,
    label_id INT NOT NULL,
    project_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    status ENUM ('en attente', 'en cours', 'cloture') DEFAULT 'en attente',
    need_attention TINYINT NOT NULL DEFAULT 0 ; 
    state INT NOT NULL DEFAULT 1
);

CREATE TABLE ticket_historical_comment (
    id INT PRIMARY KEY auto_increment,
    comment TEXT NOT NULL,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    state INT NOT NULL DEFAULT 1
);

CREATE VIEW ranked_tiket as (
    SELECT 
    	(ROW_NUMBER() OVER (
            PARTITION BY original_client_mail, num_commande 
            ORDER BY created_at
        )) AS ordre,
        (COUNT(*) OVER (
            PARTITION BY original_client_mail, num_commande
        )) AS total_in_group,
    	t.*
    FROM ticket t
);

-- detail ranked_tiket
SELECT *
FROM ranked_tiket
WHERE total_in_group >= 2
ORDER BY original_client_mail, num_commande, ordre limit 100;

-- list des demandes reccurent
CREATE VIEW ranked_tiket_list as  (
    SELECT GROUP_CONCAT(DISTINCT subject_ticket SEPARATOR ', ') as subjects_ticket, original_client_mail, num_commande, total_in_group FROM ranked_tiket WHERE total_in_group >= 2 GROUP BY original_client_mail, num_commande
);

-- Stat ranked_tiket_list
SELECT COUNT(*) as nb_reccurent, SUM(total_in_group) as total_mail_trigered FROM ranked_tiket_list;

-- Stockage des conversations relative
CREATE TABLE related_conversation (
    id INT PRIMARY KEY auto_increment,
    ticket_id INT NOT NULL,
    conversation_email_id VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT NOW()
);


-- chat bot extension -- 
CREATE TABLE conversation_chat(
    id INT PRIMARY KEY auto_increment,
    session_id VARCHAR(200) NOT NULL,
    date_created DATETIME NOT NULL DEFAULT NOW(),
    project_id INT NOT NULL,
    state INT NOT NULL DEFAULT 1
);

DROP TABLE IF EXISTS message_chat;
CREATE TABLE message_chat(
    id INT PRIMARY KEY auto_increment,
    acteur VARCHAR(180) NOT NULL,
    conversation_chat_id INT NOT NULL,
    message TEXT,
    type_message VARCHAR(25) DEFAULT "text"
    date_created DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (conversation_chat_id) REFERENCES conversation_chat(id)
);
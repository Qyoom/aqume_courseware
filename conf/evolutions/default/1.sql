# Cloze Quiz schema
 
# --- !Ups

SET sql_mode = 'NO_ZERO_DATE';

CREATE TABLE quiz (
    id INT NOT NULL AUTO_INCREMENT,
    title varchar(60),
    retries INT,
    drag BOOLEAN,
    instructions TEXT,
    created TIMESTAMP NULL,
    modified TIMESTAMP NULL,
    record_link TEXT,
    PRIMARY KEY (id)
);
CREATE TABLE quest_par_format (
    id INT NOT NULL AUTO_INCREMENT,
    format VARCHAR(20) NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE question_par (
    quiz_id INT NOT NULL,
    quest_num INT NOT NULL,
    quest_text TEXT,
    format_id INT,
    PRIMARY KEY (quiz_id, quest_num),
    INDEX quiz_ind (quiz_id),
    FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
    INDEX format_ind (format_id),
    FOREIGN KEY (format_id) REFERENCES quest_par_format(id)
);
CREATE TABLE correct_answer (
	quiz_id INT NOT NULL,
	quest_num INT NOT NULL,
	word_ind INT NOT NULL,
	corr_ans VARCHAR(45),
	PRIMARY KEY (quiz_id, quest_num, word_ind),
	INDEX quiz_ind (quiz_id),
	FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
);
CREATE TABLE draggable (
    id INT NOT NULL AUTO_INCREMENT,
    quiz_id INT NOT NULL,
    draggable VARCHAR(45),
    disp_order INT,
    PRIMARY KEY (id),
    INDEX quiz_ind (quiz_id),
	FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
);
CREATE TABLE role (
    id INT NOT NULL AUTO_INCREMENT,
    role VARCHAR(20) UNIQUE NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE user (
	id INT NOT NULL AUTO_INCREMENT,
	user_name VARCHAR(25) UNIQUE,
	first_name VARCHAR(45),
	last_name VARCHAR(45),
	password VARCHAR(20) NOT NULL,
	role VARCHAR(20) NOT NULL,
	email VARCHAR(60),
    created TIMESTAMP NULL,
    modified TIMESTAMP NULL,
	PRIMARY KEY (id)
);
CREATE TABLE course (
    id INT NOT NULL AUTO_INCREMENT,
	course_num VARCHAR(45),
	title VARCHAR(60),
	section VARCHAR(20),
	semester VARCHAR(20),
	year VARCHAR(4),
    created TIMESTAMP NULL,
    modified TIMESTAMP NULL,
	PRIMARY KEY (id)
);
CREATE TABLE quiz_course (
	quiz_id INT NOT NULL,
	course_id INT NOT NULL,
	PRIMARY KEY (quiz_id, course_id),
	INDEX quiz_ind (quiz_id),
	FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
	INDEX course_ind (course_id),
	FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE
);
CREATE TABLE unit (
	id INT NOT NULL AUTO_INCREMENT,
	course_id INT NOT NULL,
	title VARCHAR(60),
	descrip TEXT,
	schedule VARCHAR(45),
	PRIMARY KEY (id)
);
CREATE TABLE quiz_unit (
	quiz_id INT NOT NULL,
	unit_id INT NOT NULL,
	PRIMARY KEY (quiz_id, unit_id),
	INDEX quiz_ind (quiz_id),
	FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE,
	INDEX unit_ind (unit_id),
	FOREIGN KEY (unit_id) REFERENCES unit(id) ON DELETE CASCADE
);
CREATE TABLE user_course (
	user_id INT NOT NULL,
	course_id INT NOT NULL,
	PRIMARY KEY (user_id, course_id),
	INDEX user_ind (user_id),
	FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
	INDEX course_ind (course_id),
	FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE
);
CREATE TABLE quiz_attempt (
	user_id INT NOT NULL,
	quiz_id INT NOT NULL,
	attemptNum INT NOT NULL,
	score VARCHAR(20),
	taker_ans TEXT,
	date_time DATETIME,
	PRIMARY KEY (user_id, quiz_id, attemptNum),
	INDEX user_ind (user_id),
	FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
	INDEX quiz_ind (quiz_id),
	FOREIGN KEY (quiz_id) REFERENCES quiz(id) ON DELETE CASCADE
);

# --- !Downs

DROP TABLE quiz_attempt;
DROP TABLE user_course;
DROP TABLE quiz_unit;
DROP TABLE unit;
DROP TABLE quiz_course;
DROP TABLE course;
DROP TABLE user;
DROP TABLE role;
DROP TABLE draggable;
DROP TABLE correct_answer;
DROP TABLE question_par;
DROP TABLE quest_par_format;
DROP TABLE quiz;


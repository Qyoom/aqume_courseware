# Cloze Quiz schema
 
# --- !Ups

insert into quest_par_format (id, format) values(1, 'qu');
insert into quest_par_format (id, format) values(2, 'br');

insert into role (role) values ('ADMIN');
insert into role (role) values ('INSTRUCTOR');
insert into role (role) values ('STUDENT');

insert into user (user_name, first_name, last_name, password, role, email) values ('Homer', 'Richard', 'Walker', 'Swordfish', 'ADMIN', 'richard@aqume.com');
insert into user (user_name, first_name, last_name, password, role, email) values ('MJ', 'Melissa', 'Jones', 'Secret', 'INSTRUCTOR', 'Melissa@sample.edu');
insert into user (user_name, first_name, last_name, password, role, email) values ('Yubba', 'Yuri', 'Abramov', 'Secret', 'STUDENT', 'Yuri@sample.com');

insert into course (course_num, title, section, semester, year) values ('ESL301', 'Workplace English', '1', 'Spring', '2013');
insert into course (course_num, title, section, semester, year) values ('ESL301', 'Workplace English', '2', 'Spring', '2013');
insert into course (course_num, title, section, semester, year) values ('SPAN405', 'Intermediate Spanish A', '1', 'Spring', '2013');
insert into course (course_num, title, section, semester, year) values ('SPAN428', 'Intermediate Spanish B', '1', 'Spring', '2013');
insert into course (course_num, title, section, semester, year) values ('ARAB201', 'Advanced Beginning Arabic', '1', 'Spring', '2013');
insert into course (course_num, title, section, semester, year) values ('MAND101', 'Elementary Mandarin', '1', 'Spring', '2013');
insert into course (course_num, title, section, semester, year) values ('SPAN101', 'Elementary Spanish', '2', 'Spring', '2013');
insert into course (course_num, title, section, semester, year) values ('ESL401', 'English Grammar', '1', 'Spring', '2013');

insert into user_course (user_id, course_id) values (2, 2);
insert into user_course (user_id, course_id) values (2, 8);
insert into user_course (user_id, course_id) values (1, 4);
insert into user_course (user_id, course_id) values (3, 8);
insert into user_course (user_id, course_id) values (3, 7);

# --- !Downs

delete from user_course;
delete from course;
delete from user;
delete from role;
delete from quest_par_format;

# Cloze Quiz schema
 
# --- !Ups

insert into quest_par_format (id, format) values(1, 'qu');
insert into quest_par_format (id, format) values(2, 'br');

insert into role (role) values ('ADMIN');
insert into role (role) values ('INSTRUCTOR');
insert into role (role) values ('STUDENT');

insert into user (user_name, first_name, last_name, password, role_id, email) values ('Homer', 'Richard', 'Walker', 'Swordfish', 2, 'richard@aqume.com');
insert into user (user_name, first_name, last_name, password, role_id, email) values ('MJ', 'Melissa', 'Jones', 'Secret', 2, 'Melissa@sample.edu');
insert into user (user_name, first_name, last_name, password, role_id, email) values ('Yubba', 'Yuri', 'Abramov', 'Secret', 3, 'Yuri@sample.com');

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

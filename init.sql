create user 'camille'@'localhost' identified by 'camille';
grant all privileges on *.* to 'camille'@'localhost';
grant all privileges on development.* to 'camille'@'localhost';

FLUSH PRIVILEGES;
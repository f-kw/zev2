#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

extern char **environ;

static int
valid_leaf(const char *value)
{
    return value != NULL
        && value[0] != '\0'
        && strcmp(value, ".") != 0
        && strcmp(value, "..") != 0
        && strchr(value, '/') == NULL;
}

static int
mapped_exit(int error_number)
{
    if (error_number == EEXIST) {
        return 20;
    }
    if (error_number == ENOTSUP
#if defined(EOPNOTSUPP) && EOPNOTSUPP != ENOTSUP
        || error_number == EOPNOTSUPP
#endif
    ) {
        return 21;
    }
    if (error_number == ELOOP
#ifdef ENOTCAPABLE
        || error_number == ENOTCAPABLE
#endif
    ) {
        return 22;
    }
    if (error_number == ENOENT || error_number == ENOTDIR) {
        return 23;
    }
    if (error_number == EXDEV) {
        return 24;
    }
    if (error_number == EBADF || error_number == EINVAL) {
        return 25;
    }
    return 26;
}

int
main(int argc, char **argv)
{
    struct stat parent_stat;
    struct stat staging_fd_stat;
    struct stat staging_leaf_stat;

    if (argc != 3
        || environ == NULL
        || environ[0] != NULL
        || !valid_leaf(argv[1])
        || !valid_leaf(argv[2])) {
        return 25;
    }
    if (fstat(3, &parent_stat) != 0
        || fstat(4, &staging_fd_stat) != 0
        || !S_ISDIR(parent_stat.st_mode)
        || !S_ISDIR(staging_fd_stat.st_mode)) {
        return mapped_exit(errno);
    }
    if (fstatat(3, argv[1], &staging_leaf_stat, AT_SYMLINK_NOFOLLOW) != 0) {
        return mapped_exit(errno);
    }
    if (S_ISLNK(staging_leaf_stat.st_mode)) {
        return 22;
    }
    if (!S_ISDIR(staging_leaf_stat.st_mode)
        || staging_leaf_stat.st_dev != staging_fd_stat.st_dev
        || staging_leaf_stat.st_ino != staging_fd_stat.st_ino) {
        return 23;
    }
    if (renameatx_np(
            3,
            argv[1],
            3,
            argv[2],
            RENAME_EXCL | RENAME_NOFOLLOW_ANY | RENAME_RESOLVE_BENEATH
        ) == 0) {
        return 0;
    }
    return mapped_exit(errno);
}

---
title: "파일 쓰기 함수 분석"
description: "파일 쓰기 함수 분석"
date: 2026-03-31
tags: ["Pwnable"]
authors: ["woot"]
---

## 파일 쓰기 과정

파일에 데이터를 쓰기 위한 함수는 대표적으로 fwrite, fputs가 있고 해당 함수는 라이브러리 내부에서 \_IO\_sputn 함수를 호출한다.

### \_IO\_new\_file\_xsputn

```
#define _IO_sputn(__fp, __s, __n) _IO_XSPUTN (__fp, __s, __n)

_IO_size_t
_IO_new_file_xsputn (_IO_FILE *f, const void *data, _IO_size_t n)
{
  ...
  if (to_do + must_flush > 0)
    {
      _IO_size_t block_size, do_write;
      /* Next flush the (full) buffer. */
      if (_IO_OVERFLOW (f, EOF) == EOF)
```

\_IO\_XPUTN 함수의 매크로이고 실질적으로 \_IO\_new\_file\_xputn 함수를 실행한다. 이 함수에서 파일 함수로 전달된 인자인 데이터와 길이를 검사하고 \_IO\_new\_file\_overflow 함수를 호출한다. 파일에 내용을 쓰는 과정은 \_IO\_new\_file\_overflow 함수를 호출하면서 이뤄진다고 보면 된다.

###  \_IO\_new\_file\_overflow

```
int
_IO_new_file_overflow (_IO_FILE *f, int ch)
{
  if (f->_flags & _IO_NO_WRITES) /* SET ERROR */
    {
      f->_flags |= _IO_ERR_SEEN;
      __set_errno (EBADF);
      return EOF;
    }
  /* If currently reading or no buffer allocated. */
  if ((f->_flags & _IO_CURRENTLY_PUTTING) == 0 || f->_IO_write_base == NULL)
    {
      /* Allocate a buffer if needed. */
      if (f->_IO_write_base == NULL)
    {
      _IO_doallocbuf (f);
      _IO_setg (f, f->_IO_buf_base, f->_IO_buf_base, f->_IO_buf_base);
    }
      /* Otherwise must be currently reading.
     If _IO_read_ptr (and hence also _IO_read_end) is at the buffer end,
     logically slide the buffer forwards one block (by setting the
     read pointers to all point at the beginning of the block).  This
     makes room for subsequent output.
     Otherwise, set the read pointers to _IO_read_end (leaving that
     alone, so it can continue to correspond to the external position). */
      if (__glibc_unlikely (_IO_in_backup (f)))
    {
      size_t nbackup = f->_IO_read_end - f->_IO_read_ptr;
      _IO_free_backup_area (f);
      f->_IO_read_base -= MIN (nbackup,
                   f->_IO_read_base - f->_IO_buf_base);
      f->_IO_read_ptr = f->_IO_read_base;
    }
      if (f->_IO_read_ptr == f->_IO_buf_end)
    f->_IO_read_end = f->_IO_read_ptr = f->_IO_buf_base;
      f->_IO_write_ptr = f->_IO_read_ptr;
      f->_IO_write_base = f->_IO_write_ptr;
      f->_IO_write_end = f->_IO_buf_end;
      f->_IO_read_base = f->_IO_read_ptr = f->_IO_read_end;
      f->_flags |= _IO_CURRENTLY_PUTTING;
      if (f->_mode <= 0 && f->_flags & (_IO_LINE_BUF | _IO_UNBUFFERED))
    f->_IO_write_end = f->_IO_write_ptr;
    }
  if (ch == EOF)
    return _IO_do_write (f, f->_IO_write_base,
             f->_IO_write_ptr - f->_IO_write_base);
  ...
}
int
_IO_new_do_write (_IO_FILE *fp, const char *data, _IO_size_t to_do)
{
  return (to_do == 0
	  || (_IO_size_t) new_do_write (fp, data, to_do) == to_do) ? 0 : EOF;
}
libc_hidden_ver (_IO_new_do_write, _IO_do_write)
```

4 ~ 9 라인

```
if (f->_flags & _IO_NO_WRITES) /* SET ERROR */
    {
      f->_flags |= _IO_ERR_SEEN;
      __set_errno (EBADF);
      return EOF;
    }
```

해당 부분에서 \_flags에 쓰기 권한이 있는지 확인한다.

11 ~ 43 라인

```
if ((f->_flags & _IO_CURRENTLY_PUTTING) == 0 || f->_IO_write_base == NULL)
    {
      /* Allocate a buffer if needed. */
      if (f->_IO_write_base == NULL)
    {
      _IO_doallocbuf (f);
      _IO_setg (f, f->_IO_buf_base, f->_IO_buf_base, f->_IO_buf_base);
    }
      /* Otherwise must be currently reading.
     If _IO_read_ptr (and hence also _IO_read_end) is at the buffer end,
     logically slide the buffer forwards one block (by setting the
     read pointers to all point at the beginning of the block).  This
     makes room for subsequent output.
     Otherwise, set the read pointers to _IO_read_end (leaving that
     alone, so it can continue to correspond to the external position). */
      if (__glibc_unlikely (_IO_in_backup (f)))
    {
      size_t nbackup = f->_IO_read_end - f->_IO_read_ptr;
      _IO_free_backup_area (f);
      f->_IO_read_base -= MIN (nbackup,
                   f->_IO_read_base - f->_IO_buf_base);
      f->_IO_read_ptr = f->_IO_read_base;
    }
      if (f->_IO_read_ptr == f->_IO_buf_end)
    f->_IO_read_end = f->_IO_read_ptr = f->_IO_buf_base;
      f->_IO_write_ptr = f->_IO_read_ptr;
      f->_IO_write_base = f->_IO_write_ptr;
      f->_IO_write_end = f->_IO_buf_end;
      f->_IO_read_base = f->_IO_read_ptr = f->_IO_read_end;
      f->_flags |= _IO_CURRENTLY_PUTTING;
      if (f->_mode <= 0 && f->_flags & (_IO_LINE_BUF | _IO_UNBUFFERED))
    f->_IO_write_end = f->_IO_write_ptr;
    }
```

11번 라인에서 \_flags에 \_IO\_CURRENTLY\_PUTTING가 설정되어 있지 않으면 12번~43번 라인에 걸쳐 파일 구조체의 write\_ptr, write\_base, write\_end 필드 등을 다른 값으로 변조한다.

44 ~ 46 라인

```
if (ch == EOF)
    return _IO_do_write (f, f->_IO_write_base,
             f->_IO_write_ptr - f->_IO_write_base);
  ...
}
```

해당 부분에서 cg가 EOF면 \_IO\_do\_write를 호출

50 ~ 54 라인

```
_IO_new_do_write (_IO_FILE *fp, const char *data, _IO_size_t to_do)
{
  return (to_do == 0
	  || (_IO_size_t) new_do_write (fp, data, to_do) == to_do) ? 0 : EOF;
}
```

\_IO\_do\_write 함수는 내부적으로 new\_do\_write 함수를 호출

### new\_do\_write

```
#define _IO_SYSWRITE(FP, DATA, LEN) JUMP2 (__write, FP, DATA, LEN)
static
_IO_size_t
new_do_write (_IO_FILE *fp, const char *data, _IO_size_t to_do)
{
  _IO_size_t count;
  if (fp->_flags & _IO_IS_APPENDING)
    /* On a system without a proper O_APPEND implementation,
       you would need to sys_seek(0, SEEK_END) here, but is
       not needed nor desirable for Unix- or Posix-like systems.
       Instead, just indicate that offset (before and after) is
       unpredictable. */
    fp->_offset = _IO_pos_BAD;
  else if (fp->_IO_read_end != fp->_IO_write_base)
    {
      _IO_off64_t new_pos
	= _IO_SYSSEEK (fp, fp->_IO_write_base - fp->_IO_read_end, 1);
      if (new_pos == _IO_pos_BAD)
	return 0;
      fp->_offset = new_pos;
    }
  count = _IO_SYSWRITE (fp, data, to_do);
  if (fp->_cur_column && count)
    fp->_cur_column = _IO_adjust_column (fp->_cur_column - 1, data, count) + 1;
  _IO_setg (fp, fp->_IO_buf_base, fp->_IO_buf_base, fp->_IO_buf_base);
  fp->_IO_write_base = fp->_IO_write_ptr = fp->_IO_buf_base;
  fp->_IO_write_end = (fp->_mode <= 0
		       && (fp->_flags & (_IO_LINE_BUF | _IO_UNBUFFERED))
		       ? fp->_IO_buf_base : fp->_IO_buf_end);
  return count;
}
```

파일 쓰기에 앞서 파일 포인터의 \_flags 변수에 \_IO\_IS\_APPENDING 플래그가 포함되어 있는지 확인하고 포함되어 있지 않다면 \_IO\_read\_end 와 \_IO\_write\_base가 다르면 lseek 시스템을 호출한다.

### \_IO\_SYSWRITE 호출

```
#define _IO_SYSWRITE(FP, DATA, LEN) JUMP2 (__write, FP, DATA, LEN)
```

new\_do\_write 함수 인자인 data, to\_do를 인자로 \_IO\_SYSWRITE 함수 호출하는데 이게 vtable의 \_IO\_new\_file\_write 함수이다.

### \_IO\_new\_file\_write

```
_IO_ssize_t
_IO_new_file_write (_IO_FILE *f, const void *data, _IO_ssize_t n)
{
  _IO_ssize_t to_do = n;
  while (to_do > 0)
    {
      _IO_ssize_t count = (__builtin_expect (f->_flags2
               & _IO_FLAGS2_NOTCANCEL, 0)
         ? write_not_cancel (f->_fileno, data, to_do)
         : write (f->_fileno, data, to_do));
      if (count < 0)
  {
    f->_flags |= _IO_ERR_SEEN;
    break;
  }
      to_do -= count;
      data = (void *) ((char *) data + count);
    }
  n -= to_do;
  if (f->_offset >= 0)
    f->_offset += n;
  return n;
}
```

해당 함수 내부에서 write 시스템 콜을 사용해서 파일에 데이터를 작성한다. 파일 디스크립터인 \_fileno, \_IO\_write\_base인 data 그리고 \_IO\_write\_ptr - \_IO\_write\_base로 연산된 to\_do가 변수로 전달된다.

```
write(f->_fileno, _IO_write_base, _IO_write_ptr - _IO_write_base);
```
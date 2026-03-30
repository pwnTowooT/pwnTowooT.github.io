---
title: "파일 읽기 함수 분석"
description: "파일 읽기 함수 분석"
date: 2026-03-31
tags: ["Pwnable"]
authors: ["woot"]
---

## 파일 읽기 과정

파일 내용을 읽기 위한 함수는 대표적으로 fread, fgets가 있습니다. 해당 함수들은 라이브러리 내부에서 \_IO\_file\_xsgent 함수를 호출합니다.

### \_ IO\_file\_xsgent

```
_IO_size_t
_IO_file_xsgetn (_IO_FILE *fp, void *data, _IO_size_t n)
{
  _IO_size_t want, have;
  _IO_ssize_t count;
  _char *s = data;
  want = n;
    ...
	  /* If we now want less than a buffer, underflow and repeat
	     the copy.  Otherwise, _IO_SYSREAD directly to
	     the user buffer. */
	  if (fp->_IO_buf_base
	      && want < (size_t) (fp->_IO_buf_end - fp->_IO_buf_base))
	    {
	      if (__underflow (fp) == EOF)
		break;

	      continue;
	    }
	...
}
```

위 코드를 보면 파일 함수의 인자로 전달된 n이 \_IO\_buf\_end - \_IO\_buf\_base 값 보다 작은지 검사하고 \_underflow를 호출 합니다.

### \_IO\_new\_file\_underflow

```
int _IO_new_file_underflow (FILE *fp)
{
  ssize_t count;
  if (fp->_flags & _IO_NO_READS)           
    {
      fp->_flags |= _IO_ERR_SEEN;
      __set_errno (EBADF);
      return EOF;
    }
   ...
   count = _IO_SYSREAD (fp, fp->_IO_buf_base,     
	fp->_IO_buf_end - fp->_IO_buf_base);
}
```

해당 함수에서는 먼저 \_flags에 읽기 권한이 있는지 확인하고 \_IO\_SYSREAD 함수의 인자로 파일 포인터와 파일 구조체의 멤버 변수를 연산한 값이 전달 됩니다.

### \_IO\_SYSREAD

```
#define _IO_SYSREAD(FP, DATA, LEN) JUMP2 (__read, FP, DATA, LEN)
```

\_IO\_SYSREAD는 vtable의 \_IO\_file\_read 함수이다 즉, vtable에 들어있는 read 함수를 호출

### \_IO\_file\_read

```
_IO_ssize_t
_IO_file_read (_IO_FILE *fp, void *buf, _IO_ssize_t size)
{
  return (__builtin_expect (fp->_flags2 & _IO_FLAGS2_NOTCANCEL, 0)
	  ? __read_nocancel (fp->_fileno, buf, size)
	  : __read (fp->_fileno, buf, size));
}
```

\_IO\_file\_read 함수 내부에서는 read 시스템 콜을 사용해 파일의 데이터를 읽습니다. 시스템 콜의 인자로 파일 구조체에서 파일 디스크립터를 나타내는 \_fileno, \_IO\_buf\_base인 buf 그리고 \_IO\_buf\_end - IO\_buf\_base로 연산된 size 변수가 전달됩니다.

```
read(f->_fileno, _IO_buf_base, _IO_buf_end - _IO_buf_base);
```
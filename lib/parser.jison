/* description: Parses end evaluates mathematical expressions. */
/* lexical grammar */
/* TODO: define grammar and handlers for cell and time */
%lex
%%
\s+									                                                            {/* skip whitespace */}
'"'("\\"["]|[^"])*'"'				                                                    {return 'STRING';}
"'"('\\'[']|[^'])*"'"				                                                    {return 'STRING';}
[A-Za-z][A-Za-z_0-9]+(?=\s*[(])                                                {return 'FUNCTION';}
[A-Za-z]+[0-9]+                                                                 {return 'CELL';}
[A-Za-z]+(?=[(])    				                                                    {return 'FUNCTION';}
[0-9]+          			  		                                                    {return 'NUMBER';}
"$"									                                                            {/* skip whitespace */}
"&"                                                                             {return '&';}
" "									                                                            {return ' ';}
[.]									                                                            {return 'DECIMAL';}
":"									                                                            {return ':';}
","									                                                            {return ',';}
"*" 								                                                            {return '*';}
"/" 								                                                            {return '/';}
"-" 								                                                            {return '-';}
"+" 								                                                            {return '+';}
"^" 								                                                            {return '^';}
"(" 								                                                            {return '(';}
")" 								                                                            {return ')';}
">" 								                                                            {return '>';}
"<" 								                                                            {return '<';}
'"'									                                                            {return '"';}
"'"									                                                            {return "'";}
"!"									                                                            {return "!";}
"="									                                                            {return '=';}
"%"									                                                            {return '%';}
[#]									                                                            {return '#';}
<<EOF>>								                                                          {return 'EOF';}
/lex

/* operator associations and precedence (low-top, high- bottom) */
%left '='
%left '<=' '>=' '<>' '!' '||'
%left '>' '<'
%left '+' '-'
%left '*' '/'
%left '^'
%left '&'
%left '%'
%left UMINUS

%start expressions

%% /* language grammar */

expressions
    : expression EOF {
        return $1;
    }
;

expression
    : number {
        $$ = $1;
      }
    | STRING {
        $$ = eval($1);
      }
    | expression '&' expression {
        $$ = $1 && $3;
      }
    | expression '=' expression {
        $$ = $1 == $3;
      }
    | expression '+' expression {
        $$ = $1 + $3;
      }
    | '(' expression ')' {
        $$ = $2;
      }
    | expression '<' '=' expression {
        $$ = $1 <= $4;
      }
    | expression '>' '=' expression {
        $$ = $1 >= $4;
      }
    | expression '<' '>' expression {
        $$ = $1 != $4;
      }
    | expression '!' '=' expression {
        $$ = $1 != $4;
      }
    | expression '>' expression {
        $$ = $1 > $3;
      }
    | expression '<' expression {
        $$ = $1 < $3;
      }
    | expression '-' expression {
        $$ = $1 - $3;
      }
    | expression '*' expression {
        $$ = $1 * $3;
      }
    | expression '/' expression {
        if ($3 == 0) {
            throw 'Division by zero'
        }
        $$ = $1 / $3;
      }
    | expression '^' expression {
        $$ = Math.pow($1, $3);
      }
    | '-' expression {
        $$ = -1 * $2;
      }
    | '+' expression {
        $$ = 1 * $2;
      }
    | FUNCTION '(' ')' {
        $$ = yy.helper.callFunction($1, []);
      }
    | FUNCTION '(' expseq ')' {
        $$ = yy.helper.callFunction($1, $3);
      }
    | cell
    | error
    | error error
;

cell
    : CELL {
      $$ = yy.helper.cellValue($1);
    }
    | CELL ':' CELL {
      $$ = yy.helper.cellRange($1 + ':' + $3);
    }
;

expseq
    : expression {
      if (yy.helper.isArray($1)) {
        $$ = $1;
      } else {
        $$ = [$1];
      }
    }
    | expseq ',' expression {
      $1.push($3);
      $$ = $1;
    }
;

number
    : NUMBER {
      $$ = parseFloat($1);
    }
    | NUMBER DECIMAL NUMBER {
      $$ = +($1 + '.' + $3);
    }
;

%%

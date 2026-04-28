*&---------------------------------------------------------------------*
*& Include          LZHAYAT_DDICTOP                                    *
*& Function Group   ZHAYAT_DDIC                                        *
*&---------------------------------------------------------------------*
*& HR DDIC Dispatcher — TOP include                                    *
*& TYPES + helper subroutines used by Z_HAYAT_DDIC_CREATE.             *
*&---------------------------------------------------------------------*

FUNCTION-POOL zhayat_ddic.

TYPES: BEGIN OF ty_fixed_value,
         low    TYPE dd07v-domvalue_l,
         high   TYPE dd07v-domvalue_h,
         ddtext TYPE dd07v-ddtext,
       END OF ty_fixed_value,
       tt_fixed_values TYPE STANDARD TABLE OF ty_fixed_value WITH DEFAULT KEY.

TYPES: BEGIN OF ty_field,
         fieldname TYPE dd03p-fieldname,
         rollname  TYPE dd03p-rollname,
         keyflag   TYPE abap_bool,
         notnull   TYPE abap_bool,
         reftable  TYPE dd03p-reftable,
         reffield  TYPE dd03p-reffield,
       END OF ty_field,
       tt_fields TYPE STANDARD TABLE OF ty_field WITH DEFAULT KEY.

TYPES: BEGIN OF ty_include,
         structure TYPE dd03p-precfield,
         suffix    TYPE dd03p-groupname,
       END OF ty_include,
       tt_includes TYPE STANDARD TABLE OF ty_include WITH DEFAULT KEY.

TYPES: BEGIN OF ty_domain_spec,
         description  TYPE dd01v-ddtext,
         datatype     TYPE dd01v-datatype,
         leng         TYPE dd01v-leng,
         decimals     TYPE dd01v-decimals,
         outputlen    TYPE dd01v-outputlen,
         convexit     TYPE dd01v-convexit,
         lowercase    TYPE abap_bool,
         value_table  TYPE dd01v-entitytab,
         fixed_values TYPE tt_fixed_values,
       END OF ty_domain_spec.

TYPES: BEGIN OF ty_dtel_spec,
         description TYPE dd04v-ddtext,
         domname     TYPE dd04v-domname,
         headlen     TYPE dd04v-headlen,
         scrlen1     TYPE dd04v-scrlen1,
         scrlen2     TYPE dd04v-scrlen2,
         scrlen3     TYPE dd04v-scrlen3,
         reptext     TYPE dd04v-reptext,
         scrtext_s   TYPE dd04v-scrtext_s,
         scrtext_m   TYPE dd04v-scrtext_m,
         scrtext_l   TYPE dd04v-scrtext_l,
       END OF ty_dtel_spec.

TYPES: BEGIN OF ty_table_spec,
         description      TYPE dd02v-ddtext,
         delivery_class   TYPE dd02v-contflag,
         data_maintenance TYPE dd02v-mainflag,
         fields           TYPE tt_fields,
         includes         TYPE tt_includes,
       END OF ty_table_spec.

TYPES: BEGIN OF ty_structure_spec,
         description TYPE dd02v-ddtext,
         fields      TYPE tt_fields,
         includes    TYPE tt_includes,
       END OF ty_structure_spec.

TYPES: BEGIN OF ty_ttyp_spec,
         description TYPE dd40v-ddtext,
         rowtype     TYPE dd40v-rowtype,
         rowkind     TYPE dd40v-rowkind,
         accessmode  TYPE dd40v-accessmode,
         keykind     TYPE dd40v-keydef,
       END OF ty_ttyp_spec.

CONSTANTS:
  c_obj_domain    TYPE c LENGTH 10 VALUE 'DOMAIN',
  c_obj_dtel      TYPE c LENGTH 10 VALUE 'DTEL',
  c_obj_structure TYPE c LENGTH 10 VALUE 'STRUCTURE',
  c_obj_table     TYPE c LENGTH 10 VALUE 'TABLE',
  c_obj_ttyp      TYPE c LENGTH 10 VALUE 'TTYP'.

*&---------------------------------------------------------------------*
*& Helpers (PERFORM-callable from FM body)
*&---------------------------------------------------------------------*

FORM add_log USING iv_type TYPE bapiret2-type
                    iv_msg  TYPE string
              CHANGING ct_log TYPE bapirettab.
  DATA ls TYPE bapiret2.
  ls-type    = iv_type.
  ls-message = iv_msg.
  APPEND ls TO ct_log.
ENDFORM.

FORM register_object USING iv_object    TYPE tadir-object
                            iv_obj_name  TYPE tadir-obj_name
                            iv_package   TYPE devclass
                            iv_transport TYPE trkorr
                      CHANGING cv_ok TYPE abap_bool
                                ct_log TYPE bapirettab.
  DATA: lv_devclass TYPE tadir-devclass,
        lt_objects  TYPE STANDARD TABLE OF e071,
        ls_object   TYPE e071.

  cv_ok       = abap_false.
  lv_devclass = iv_package.

  CALL FUNCTION 'TR_TADIR_INTERFACE'
    EXPORTING
      wi_test_modus              = abap_false
      wi_tadir_pgmid             = 'R3TR'
      wi_tadir_object            = iv_object
      wi_tadir_obj_name          = iv_obj_name
      wi_tadir_devclass          = lv_devclass
      wi_tadir_srcsystem         = sy-sysid
      iv_set_edtflag             = abap_true
      iv_delflag                 = abap_false
    EXCEPTIONS
      OTHERS                     = 99.

  IF sy-subrc <> 0.
    PERFORM add_log USING 'E' |TR_TADIR_INTERFACE failed (subrc { sy-subrc }) for { iv_obj_name }|
                CHANGING ct_log.
    RETURN.
  ENDIF.

  IF iv_transport IS NOT INITIAL AND lv_devclass <> '$TMP'.
    ls_object-pgmid    = 'R3TR'.
    ls_object-object   = iv_object.
    ls_object-obj_name = iv_obj_name.
    APPEND ls_object TO lt_objects.

    CALL FUNCTION 'TR_OBJECTS_INSERT'
      EXPORTING
        wi_order          = iv_transport
        wi_without_dialog = abap_true
      TABLES
        wt_ko200          = lt_objects
      EXCEPTIONS
        OTHERS            = 1.

    IF sy-subrc <> 0.
      PERFORM add_log USING 'W' |Transport append failed for { iv_obj_name } -> { iv_transport }|
                  CHANGING ct_log.
    ENDIF.
  ENDIF.

  cv_ok = abap_true.
ENDFORM.

FORM build_dd03p_table USING it_fields    TYPE tt_fields
                              it_includes  TYPE tt_includes
                        CHANGING ct_dd03p TYPE STANDARD TABLE.
  DATA: ls_dd03p TYPE dd03p,
        lv_pos   TYPE i VALUE 0.

  CLEAR ct_dd03p[].

  LOOP AT it_fields ASSIGNING FIELD-SYMBOL(<f>).
    lv_pos = lv_pos + 1.
    CLEAR ls_dd03p.
    ls_dd03p-fieldname = <f>-fieldname.
    ls_dd03p-position  = lv_pos.
    ls_dd03p-rollname  = <f>-rollname.
    IF <f>-keyflag = abap_true.
      ls_dd03p-keyflag = 'X'.
    ENDIF.
    IF <f>-notnull = abap_true OR <f>-keyflag = abap_true.
      ls_dd03p-notnull = 'X'.
    ENDIF.
    ls_dd03p-reftable = <f>-reftable.
    ls_dd03p-reffield = <f>-reffield.
    APPEND ls_dd03p TO ct_dd03p.
  ENDLOOP.

  LOOP AT it_includes ASSIGNING FIELD-SYMBOL(<i>).
    lv_pos = lv_pos + 1.
    CLEAR ls_dd03p.
    ls_dd03p-fieldname = '.INCLUDE'.
    ls_dd03p-position  = lv_pos.
    ls_dd03p-precfield = <i>-structure.
    ls_dd03p-groupname = <i>-suffix.
    APPEND ls_dd03p TO ct_dd03p.
  ENDLOOP.
ENDFORM.

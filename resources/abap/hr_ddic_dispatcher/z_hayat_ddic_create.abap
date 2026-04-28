FUNCTION z_hayat_ddic_create.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING
*"     VALUE(IV_OBJECT_TYPE) TYPE  CHAR10
*"     VALUE(IV_OBJECT_NAME) TYPE  TADIR-OBJ_NAME
*"     VALUE(IV_PACKAGE) TYPE  DEVCLASS
*"     VALUE(IV_TRANSPORT) TYPE  TRKORR OPTIONAL
*"     VALUE(IV_SPEC_JSON) TYPE  STRING
*"     VALUE(IV_ACTIVATE) TYPE  ABAP_BOOL DEFAULT 'X'
*"  EXPORTING
*"     VALUE(EV_SUCCESS) TYPE  ABAP_BOOL
*"     VALUE(EV_MESSAGE) TYPE  STRING
*"     VALUE(ET_LOG) TYPE  BAPIRETTAB
*"----------------------------------------------------------------------
*&---------------------------------------------------------------------*
*& Z_HAYAT_DDIC_CREATE                                                 *
*&                                                                     *
*& HR sisteminde Domain / Data Element / Structure / Table / Table     *
*& Type olusturmak icin dispatcher FM. JSON spec ile cagrilir;         *
*& standart DDIF_*_PUT + DDIF_*_ACTIVATE zincirini kosturur.           *
*&---------------------------------------------------------------------*

  DATA: lv_obj_type TYPE c LENGTH 10,
        lv_obj_name TYPE tadir-obj_name,
        lv_rc       TYPE sy-subrc,
        lv_ok       TYPE abap_bool.

  CLEAR: ev_success, ev_message, et_log.

  lv_obj_type = iv_object_type.
  TRANSLATE lv_obj_type TO UPPER CASE.
  lv_obj_name = iv_object_name.
  TRANSLATE lv_obj_name TO UPPER CASE.

  IF lv_obj_name IS INITIAL.
    ev_message = 'IV_OBJECT_NAME is required'.
    RETURN.
  ENDIF.
  IF iv_package IS INITIAL.
    ev_message = 'IV_PACKAGE is required'.
    RETURN.
  ENDIF.

  CASE lv_obj_type.

*&----------------------------------- DOMAIN ---------------------------*
    WHEN c_obj_domain.
      DATA: ls_dom_spec TYPE ty_domain_spec,
            ls_dd01v    TYPE dd01v,
            lt_dd07v    TYPE STANDARD TABLE OF dd07v,
            ls_dd07v    TYPE dd07v,
            lv_pos      TYPE i.

      TRY.
          /ui2/cl_json=>deserialize(
            EXPORTING json         = iv_spec_json
                      pretty_name  = /ui2/cl_json=>pretty_mode-camel_case
                      assoc_arrays = abap_true
            CHANGING  data         = ls_dom_spec ).
        CATCH cx_root INTO DATA(lx_dom).
          ev_message = |JSON parse failed: { lx_dom->get_text( ) }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
      ENDTRY.

      ls_dd01v-domname    = lv_obj_name.
      ls_dd01v-ddlanguage = sy-langu.
      ls_dd01v-ddtext     = ls_dom_spec-description.
      ls_dd01v-datatype   = ls_dom_spec-datatype.
      ls_dd01v-leng       = ls_dom_spec-leng.
      ls_dd01v-decimals   = ls_dom_spec-decimals.
      ls_dd01v-outputlen  = ls_dom_spec-outputlen.
      ls_dd01v-convexit   = ls_dom_spec-convexit.
      IF ls_dom_spec-lowercase = abap_true.
        ls_dd01v-lowercase = 'X'.
      ENDIF.
      ls_dd01v-entitytab = ls_dom_spec-value_table.

      LOOP AT ls_dom_spec-fixed_values ASSIGNING FIELD-SYMBOL(<fv>).
        lv_pos = lv_pos + 1.
        CLEAR ls_dd07v.
        ls_dd07v-domname    = lv_obj_name.
        ls_dd07v-ddlanguage = sy-langu.
        ls_dd07v-valpos     = lv_pos.
        ls_dd07v-domvalue_l = <fv>-low.
        ls_dd07v-domvalue_h = <fv>-high.
        ls_dd07v-ddtext     = <fv>-ddtext.
        APPEND ls_dd07v TO lt_dd07v.
      ENDLOOP.

      CALL FUNCTION 'DDIF_DOMA_PUT'
        EXPORTING
          name              = lv_obj_name
          dd01v_wa          = ls_dd01v
        TABLES
          dd07v_tab         = lt_dd07v
        EXCEPTIONS
          doma_not_found    = 1
          name_inconsistent = 2
          doma_inconsistent = 3
          put_failure       = 4
          put_refused       = 5
          OTHERS            = 6.
      IF sy-subrc <> 0.
        ev_message = |DDIF_DOMA_PUT failed (subrc { sy-subrc }) for { lv_obj_name }|.
        PERFORM add_log USING 'E' ev_message CHANGING et_log.
        RETURN.
      ENDIF.

      PERFORM register_object
        USING 'DOMA' lv_obj_name iv_package iv_transport
        CHANGING lv_ok et_log.
      IF lv_ok = abap_false.
        ev_message = |TADIR/transport registration failed for DOMA { lv_obj_name }|.
        RETURN.
      ENDIF.

      IF iv_activate = abap_true.
        CALL FUNCTION 'DDIF_DOMA_ACTIVATE'
          EXPORTING
            name        = lv_obj_name
          IMPORTING
            rc          = lv_rc
          EXCEPTIONS
            not_found   = 1
            put_failure = 2
            OTHERS      = 3.
        IF sy-subrc <> 0 OR lv_rc <> 0.
          ev_message = |DDIF_DOMA_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { lv_obj_name }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
        ENDIF.
      ENDIF.

      ev_success = abap_true.
      ev_message = |Domain { lv_obj_name } created/activated|.
      PERFORM add_log USING 'S' ev_message CHANGING et_log.

*&----------------------------------- DATA ELEMENT --------------------*
    WHEN c_obj_dtel.
      DATA: ls_dtel_spec TYPE ty_dtel_spec,
            ls_dd04v     TYPE dd04v.

      TRY.
          /ui2/cl_json=>deserialize(
            EXPORTING json         = iv_spec_json
                      pretty_name  = /ui2/cl_json=>pretty_mode-camel_case
                      assoc_arrays = abap_true
            CHANGING  data         = ls_dtel_spec ).
        CATCH cx_root INTO DATA(lx_dtel).
          ev_message = |JSON parse failed: { lx_dtel->get_text( ) }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
      ENDTRY.

      ls_dd04v-rollname   = lv_obj_name.
      ls_dd04v-ddlanguage = sy-langu.
      ls_dd04v-ddtext     = ls_dtel_spec-description.
      ls_dd04v-domname    = ls_dtel_spec-domname.
      ls_dd04v-headlen    = ls_dtel_spec-headlen.
      ls_dd04v-scrlen1    = ls_dtel_spec-scrlen1.
      ls_dd04v-scrlen2    = ls_dtel_spec-scrlen2.
      ls_dd04v-scrlen3    = ls_dtel_spec-scrlen3.
      ls_dd04v-reptext    = ls_dtel_spec-reptext.
      ls_dd04v-scrtext_s  = ls_dtel_spec-scrtext_s.
      ls_dd04v-scrtext_m  = ls_dtel_spec-scrtext_m.
      ls_dd04v-scrtext_l  = ls_dtel_spec-scrtext_l.

      CALL FUNCTION 'DDIF_DTEL_PUT'
        EXPORTING
          name              = lv_obj_name
          dd04v_wa          = ls_dd04v
        EXCEPTIONS
          dtel_not_found    = 1
          name_inconsistent = 2
          dtel_inconsistent = 3
          put_failure       = 4
          put_refused       = 5
          OTHERS            = 6.
      IF sy-subrc <> 0.
        ev_message = |DDIF_DTEL_PUT failed (subrc { sy-subrc }) for { lv_obj_name }|.
        PERFORM add_log USING 'E' ev_message CHANGING et_log.
        RETURN.
      ENDIF.

      PERFORM register_object
        USING 'DTEL' lv_obj_name iv_package iv_transport
        CHANGING lv_ok et_log.
      IF lv_ok = abap_false.
        ev_message = |TADIR/transport registration failed for DTEL { lv_obj_name }|.
        RETURN.
      ENDIF.

      IF iv_activate = abap_true.
        CALL FUNCTION 'DDIF_DTEL_ACTIVATE'
          EXPORTING
            name        = lv_obj_name
          IMPORTING
            rc          = lv_rc
          EXCEPTIONS
            not_found   = 1
            put_failure = 2
            OTHERS      = 3.
        IF sy-subrc <> 0 OR lv_rc <> 0.
          ev_message = |DDIF_DTEL_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { lv_obj_name }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
        ENDIF.
      ENDIF.

      ev_success = abap_true.
      ev_message = |Data element { lv_obj_name } created/activated|.
      PERFORM add_log USING 'S' ev_message CHANGING et_log.

*&----------------------------------- STRUCTURE -----------------------*
    WHEN c_obj_structure.
      DATA: ls_str_spec TYPE ty_structure_spec,
            ls_dd02v_s  TYPE dd02v,
            lt_dd03p_s  TYPE STANDARD TABLE OF dd03p.

      TRY.
          /ui2/cl_json=>deserialize(
            EXPORTING json         = iv_spec_json
                      pretty_name  = /ui2/cl_json=>pretty_mode-camel_case
                      assoc_arrays = abap_true
            CHANGING  data         = ls_str_spec ).
        CATCH cx_root INTO DATA(lx_str).
          ev_message = |JSON parse failed: { lx_str->get_text( ) }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
      ENDTRY.

      IF ls_str_spec-fields IS INITIAL AND ls_str_spec-includes IS INITIAL.
        ev_message = 'Structure spec must contain at least one field or include'.
        PERFORM add_log USING 'E' ev_message CHANGING et_log.
        RETURN.
      ENDIF.

      ls_dd02v_s-tabname    = lv_obj_name.
      ls_dd02v_s-ddlanguage = sy-langu.
      ls_dd02v_s-tabclass   = 'INTTAB'.
      ls_dd02v_s-ddtext     = ls_str_spec-description.
      ls_dd02v_s-exclass    = '1'.

      PERFORM build_dd03p_table
        USING ls_str_spec-fields ls_str_spec-includes
        CHANGING lt_dd03p_s.

      CALL FUNCTION 'DDIF_TABL_PUT'
        EXPORTING
          name              = lv_obj_name
          dd02v_wa          = ls_dd02v_s
        TABLES
          dd03p_tab         = lt_dd03p_s
        EXCEPTIONS
          tabl_not_found    = 1
          name_inconsistent = 2
          tabl_inconsistent = 3
          put_failure       = 4
          put_refused       = 5
          OTHERS            = 6.
      IF sy-subrc <> 0.
        ev_message = |DDIF_TABL_PUT failed (subrc { sy-subrc }) for STRUCTURE { lv_obj_name }|.
        PERFORM add_log USING 'E' ev_message CHANGING et_log.
        RETURN.
      ENDIF.

      PERFORM register_object
        USING 'TABL' lv_obj_name iv_package iv_transport
        CHANGING lv_ok et_log.
      IF lv_ok = abap_false.
        ev_message = |TADIR/transport registration failed for STRUCTURE { lv_obj_name }|.
        RETURN.
      ENDIF.

      IF iv_activate = abap_true.
        CALL FUNCTION 'DDIF_TABL_ACTIVATE'
          EXPORTING
            name        = lv_obj_name
          IMPORTING
            rc          = lv_rc
          EXCEPTIONS
            not_found   = 1
            put_failure = 2
            OTHERS      = 3.
        IF sy-subrc <> 0 OR lv_rc <> 0.
          ev_message = |DDIF_TABL_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { lv_obj_name }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
        ENDIF.
      ENDIF.

      ev_success = abap_true.
      ev_message = |Structure { lv_obj_name } created/activated|.
      PERFORM add_log USING 'S' ev_message CHANGING et_log.

*&----------------------------------- TABLE ---------------------------*
    WHEN c_obj_table.
      DATA: ls_tab_spec TYPE ty_table_spec,
            ls_dd02v_t  TYPE dd02v,
            ls_dd09l_t  TYPE dd09l,
            lt_dd03p_t  TYPE STANDARD TABLE OF dd03p.

      TRY.
          /ui2/cl_json=>deserialize(
            EXPORTING json         = iv_spec_json
                      pretty_name  = /ui2/cl_json=>pretty_mode-camel_case
                      assoc_arrays = abap_true
            CHANGING  data         = ls_tab_spec ).
        CATCH cx_root INTO DATA(lx_tab).
          ev_message = |JSON parse failed: { lx_tab->get_text( ) }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
      ENDTRY.

      IF ls_tab_spec-fields IS INITIAL.
        ev_message = 'Table spec must contain at least one field'.
        PERFORM add_log USING 'E' ev_message CHANGING et_log.
        RETURN.
      ENDIF.

      ls_dd02v_t-tabname    = lv_obj_name.
      ls_dd02v_t-ddlanguage = sy-langu.
      ls_dd02v_t-tabclass   = 'TRANSP'.
      ls_dd02v_t-ddtext     = ls_tab_spec-description.
      ls_dd02v_t-contflag   = ls_tab_spec-delivery_class.
      ls_dd02v_t-mainflag   = ls_tab_spec-data_maintenance.
      ls_dd02v_t-exclass    = '1'.

      ls_dd09l_t-tabname   = lv_obj_name.
      ls_dd09l_t-as4local  = 'A'.
      ls_dd09l_t-tabkat    = '0'.
      ls_dd09l_t-tabart    = 'APPL0'.
      ls_dd09l_t-bufallow  = 'N'.

      PERFORM build_dd03p_table
        USING ls_tab_spec-fields ls_tab_spec-includes
        CHANGING lt_dd03p_t.

      CALL FUNCTION 'DDIF_TABL_PUT'
        EXPORTING
          name              = lv_obj_name
          dd02v_wa          = ls_dd02v_t
          dd09l_wa          = ls_dd09l_t
        TABLES
          dd03p_tab         = lt_dd03p_t
        EXCEPTIONS
          tabl_not_found    = 1
          name_inconsistent = 2
          tabl_inconsistent = 3
          put_failure       = 4
          put_refused       = 5
          OTHERS            = 6.
      IF sy-subrc <> 0.
        ev_message = |DDIF_TABL_PUT failed (subrc { sy-subrc }) for TABLE { lv_obj_name }|.
        PERFORM add_log USING 'E' ev_message CHANGING et_log.
        RETURN.
      ENDIF.

      PERFORM register_object
        USING 'TABL' lv_obj_name iv_package iv_transport
        CHANGING lv_ok et_log.
      IF lv_ok = abap_false.
        ev_message = |TADIR/transport registration failed for TABLE { lv_obj_name }|.
        RETURN.
      ENDIF.

      IF iv_activate = abap_true.
        CALL FUNCTION 'DDIF_TABL_ACTIVATE'
          EXPORTING
            name        = lv_obj_name
          IMPORTING
            rc          = lv_rc
          EXCEPTIONS
            not_found   = 1
            put_failure = 2
            OTHERS      = 3.
        IF sy-subrc <> 0 OR lv_rc <> 0.
          ev_message = |DDIF_TABL_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { lv_obj_name }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
        ENDIF.
      ENDIF.

      ev_success = abap_true.
      ev_message = |Table { lv_obj_name } created/activated|.
      PERFORM add_log USING 'S' ev_message CHANGING et_log.

*&----------------------------------- TABLE TYPE ----------------------*
    WHEN c_obj_ttyp.
      DATA: ls_ttyp_spec TYPE ty_ttyp_spec,
            ls_dd40v     TYPE dd40v.

      TRY.
          /ui2/cl_json=>deserialize(
            EXPORTING json         = iv_spec_json
                      pretty_name  = /ui2/cl_json=>pretty_mode-camel_case
                      assoc_arrays = abap_true
            CHANGING  data         = ls_ttyp_spec ).
        CATCH cx_root INTO DATA(lx_ttyp).
          ev_message = |JSON parse failed: { lx_ttyp->get_text( ) }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
      ENDTRY.

      ls_dd40v-typename   = lv_obj_name.
      ls_dd40v-ddlanguage = sy-langu.
      ls_dd40v-ddtext     = ls_ttyp_spec-description.
      ls_dd40v-rowtype    = ls_ttyp_spec-rowtype.
      ls_dd40v-rowkind    = ls_ttyp_spec-rowkind.
      ls_dd40v-accessmode = ls_ttyp_spec-accessmode.
      ls_dd40v-keydef     = ls_ttyp_spec-keykind.
      ls_dd40v-typekind   = 'E'.

      CALL FUNCTION 'DDIF_TTYP_PUT'
        EXPORTING
          name              = lv_obj_name
          dd40v_wa          = ls_dd40v
        EXCEPTIONS
          ttyp_not_found    = 1
          name_inconsistent = 2
          ttyp_inconsistent = 3
          put_failure       = 4
          put_refused       = 5
          OTHERS            = 6.
      IF sy-subrc <> 0.
        ev_message = |DDIF_TTYP_PUT failed (subrc { sy-subrc }) for { lv_obj_name }|.
        PERFORM add_log USING 'E' ev_message CHANGING et_log.
        RETURN.
      ENDIF.

      PERFORM register_object
        USING 'TTYP' lv_obj_name iv_package iv_transport
        CHANGING lv_ok et_log.
      IF lv_ok = abap_false.
        ev_message = |TADIR/transport registration failed for TTYP { lv_obj_name }|.
        RETURN.
      ENDIF.

      IF iv_activate = abap_true.
        CALL FUNCTION 'DDIF_TTYP_ACTIVATE'
          EXPORTING
            name        = lv_obj_name
          IMPORTING
            rc          = lv_rc
          EXCEPTIONS
            not_found   = 1
            put_failure = 2
            OTHERS      = 3.
        IF sy-subrc <> 0 OR lv_rc <> 0.
          ev_message = |DDIF_TTYP_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { lv_obj_name }|.
          PERFORM add_log USING 'E' ev_message CHANGING et_log.
          RETURN.
        ENDIF.
      ENDIF.

      ev_success = abap_true.
      ev_message = |Table type { lv_obj_name } created/activated|.
      PERFORM add_log USING 'S' ev_message CHANGING et_log.

    WHEN OTHERS.
      ev_message = |Unsupported IV_OBJECT_TYPE: { lv_obj_type }. Allowed: DOMAIN, DTEL, STRUCTURE, TABLE, TTYP|.
  ENDCASE.

ENDFUNCTION.

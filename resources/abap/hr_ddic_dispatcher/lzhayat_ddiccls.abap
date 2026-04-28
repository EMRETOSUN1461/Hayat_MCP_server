*&---------------------------------------------------------------------*
*& Include          LZHAYAT_DDICCLS                                    *
*&---------------------------------------------------------------------*
*& Local class — DDIC dispatcher implementation                        *
*&---------------------------------------------------------------------*

CLASS lcl_ddic_dispatcher DEFINITION.
  PUBLIC SECTION.
    METHODS:
      create_domain
        IMPORTING iv_name      TYPE tadir-obj_name
                  iv_package   TYPE devclass
                  iv_transport TYPE trkorr
                  iv_spec_json TYPE string
                  iv_activate  TYPE abap_bool
        EXPORTING ev_success   TYPE abap_bool
                  ev_message   TYPE string
                  et_log       TYPE bapirettab,

      create_dtel
        IMPORTING iv_name      TYPE tadir-obj_name
                  iv_package   TYPE devclass
                  iv_transport TYPE trkorr
                  iv_spec_json TYPE string
                  iv_activate  TYPE abap_bool
        EXPORTING ev_success   TYPE abap_bool
                  ev_message   TYPE string
                  et_log       TYPE bapirettab,

      create_structure
        IMPORTING iv_name      TYPE tadir-obj_name
                  iv_package   TYPE devclass
                  iv_transport TYPE trkorr
                  iv_spec_json TYPE string
                  iv_activate  TYPE abap_bool
        EXPORTING ev_success   TYPE abap_bool
                  ev_message   TYPE string
                  et_log       TYPE bapirettab,

      create_table
        IMPORTING iv_name      TYPE tadir-obj_name
                  iv_package   TYPE devclass
                  iv_transport TYPE trkorr
                  iv_spec_json TYPE string
                  iv_activate  TYPE abap_bool
        EXPORTING ev_success   TYPE abap_bool
                  ev_message   TYPE string
                  et_log       TYPE bapirettab,

      create_ttyp
        IMPORTING iv_name      TYPE tadir-obj_name
                  iv_package   TYPE devclass
                  iv_transport TYPE trkorr
                  iv_spec_json TYPE string
                  iv_activate  TYPE abap_bool
        EXPORTING ev_success   TYPE abap_bool
                  ev_message   TYPE string
                  et_log       TYPE bapirettab.

  PRIVATE SECTION.
    METHODS:
      add_log
        IMPORTING iv_type TYPE bapiret2-type
                  iv_msg  TYPE string
        CHANGING  ct_log  TYPE bapirettab,

      register_object
        IMPORTING iv_pgmid     TYPE tadir-pgmid DEFAULT 'R3TR'
                  iv_object    TYPE tadir-object
                  iv_obj_name  TYPE tadir-obj_name
                  iv_package   TYPE devclass
                  iv_transport TYPE trkorr
        CHANGING  ct_log       TYPE bapirettab
        RETURNING VALUE(rv_ok) TYPE abap_bool,

      json_deserialize
        IMPORTING iv_json TYPE string
        CHANGING  cs_data TYPE any
        RAISING   cx_static_check,

      build_dd03p_table
        IMPORTING it_fields    TYPE tt_fields
                  it_includes  TYPE tt_includes
        RETURNING VALUE(rt_dd03p) TYPE STANDARD TABLE OF dd03p.

ENDCLASS.

CLASS lcl_ddic_dispatcher IMPLEMENTATION.

  METHOD add_log.
    DATA ls_msg TYPE bapiret2.
    ls_msg-type = iv_type.
    ls_msg-message = iv_msg.
    APPEND ls_msg TO ct_log.
  ENDMETHOD.

  METHOD json_deserialize.
    " /ui2/cl_json deserialize. Eski sistemde mevcut değilse,
    " bu metod kapsamı dışında kalan bir adapter ile değiştirilmesi gerekir.
    /ui2/cl_json=>deserialize(
      EXPORTING
        json             = iv_json
        pretty_name      = /ui2/cl_json=>pretty_mode-camel_case
        assoc_arrays     = abap_true
      CHANGING
        data             = cs_data ).
  ENDMETHOD.

  METHOD register_object.
    DATA lv_devclass TYPE tadir-devclass.
    lv_devclass = iv_package.

    CALL FUNCTION 'TR_TADIR_INTERFACE'
      EXPORTING
        wi_test_modus              = abap_false
        wi_tadir_pgmid             = iv_pgmid
        wi_tadir_object            = iv_object
        wi_tadir_obj_name          = iv_obj_name
        wi_tadir_devclass          = lv_devclass
        wi_tadir_srcsystem         = sy-sysid
        iv_set_edtflag             = abap_true
        iv_delflag                 = abap_false
      EXCEPTIONS
        tadir_entry_not_existing   = 1
        tadir_entry_ill_type       = 2
        no_systemname              = 3
        no_systemtype              = 4
        original_system_conflict   = 5
        object_reserved_for_release = 6
        object_exists_global       = 7
        object_exists_local        = 8
        object_is_distributed      = 9
        obj_specification_not_unique = 10
        no_authorization_to_delete = 11
        devclass_not_existing      = 12
        simultanious_set_remove_repair = 13
        order_missing              = 14
        no_modification_of_head_syst = 15
        pgmid_object_not_allowed   = 16
        masterlanguage_not_specified = 17
        devclass_not_specified     = 18
        specify_owner_unique       = 19
        loc_priv_objs_no_repair    = 20
        gtadir_not_reached         = 21
        object_locked_for_order    = 22
        change_of_class_not_allowed = 23
        no_change_from_sap_to_tmp  = 24
        OTHERS                     = 25.

    IF sy-subrc <> 0.
      add_log( EXPORTING iv_type = 'E'
                         iv_msg  = |TR_TADIR_INTERFACE failed (subrc { sy-subrc }) for { iv_obj_name }|
               CHANGING  ct_log  = ct_log ).
      rv_ok = abap_false.
      RETURN.
    ENDIF.

    " Transport append (yalnızca request verildiyse, paket non-$TMP ise)
    IF iv_transport IS NOT INITIAL AND lv_devclass <> '$TMP'.
      DATA: lt_objects TYPE STANDARD TABLE OF e071,
            ls_object  TYPE e071.
      ls_object-pgmid    = iv_pgmid.
      ls_object-object   = iv_object.
      ls_object-obj_name = iv_obj_name.
      APPEND ls_object TO lt_objects.

      CALL FUNCTION 'TR_OBJECTS_INSERT'
        EXPORTING
          wi_order        = iv_transport
          wi_without_dialog = abap_true
        TABLES
          wt_ko200        = lt_objects
        EXCEPTIONS
          OTHERS          = 1.

      IF sy-subrc <> 0.
        add_log( EXPORTING iv_type = 'W'
                           iv_msg  = |Transport append failed for { iv_obj_name } -> { iv_transport }|
                 CHANGING  ct_log  = ct_log ).
      ENDIF.
    ENDIF.

    rv_ok = abap_true.
  ENDMETHOD.

  METHOD build_dd03p_table.
    DATA: ls_dd03p TYPE dd03p,
          lv_pos   TYPE i VALUE 0.

    " Önce explicit field'lar
    LOOP AT it_fields ASSIGNING FIELD-SYMBOL(<fs_field>).
      lv_pos = lv_pos + 1.
      CLEAR ls_dd03p.
      ls_dd03p-fieldname = <fs_field>-fieldname.
      ls_dd03p-position  = lv_pos.
      ls_dd03p-rollname  = <fs_field>-rollname.
      IF <fs_field>-keyflag = abap_true.
        ls_dd03p-keyflag = 'X'.
      ENDIF.
      IF <fs_field>-notnull = abap_true OR <fs_field>-keyflag = abap_true.
        ls_dd03p-notnull = 'X'.
      ENDIF.
      ls_dd03p-reftable = <fs_field>-reftable.
      ls_dd03p-reffield = <fs_field>-reffield.
      APPEND ls_dd03p TO rt_dd03p.
    ENDLOOP.

    " Sonra .INCLUDE satırları
    LOOP AT it_includes ASSIGNING FIELD-SYMBOL(<fs_inc>).
      lv_pos = lv_pos + 1.
      CLEAR ls_dd03p.
      ls_dd03p-fieldname = '.INCLUDE'.
      ls_dd03p-position  = lv_pos.
      ls_dd03p-precfield = <fs_inc>-structure.
      ls_dd03p-groupname = <fs_inc>-suffix.
      APPEND ls_dd03p TO rt_dd03p.
    ENDLOOP.
  ENDMETHOD.

*&---------------------------------------------------------------------*
*& DOMAIN
*&---------------------------------------------------------------------*
  METHOD create_domain.
    DATA: ls_spec  TYPE ty_domain_spec,
          ls_dd01v TYPE dd01v,
          lt_dd07v TYPE STANDARD TABLE OF dd07v,
          ls_dd07v TYPE dd07v,
          lv_pos   TYPE i,
          lv_rc    TYPE sy-subrc.

    ev_success = abap_false.

    TRY.
        json_deserialize( EXPORTING iv_json = iv_spec_json CHANGING cs_data = ls_spec ).
      CATCH cx_root INTO DATA(lx_json).
        ev_message = |JSON parse failed: { lx_json->get_text( ) }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
    ENDTRY.

    ls_dd01v-domname    = iv_name.
    ls_dd01v-ddlanguage = sy-langu.
    ls_dd01v-ddtext     = ls_spec-description.
    ls_dd01v-datatype   = ls_spec-datatype.
    ls_dd01v-leng       = ls_spec-leng.
    ls_dd01v-decimals   = ls_spec-decimals.
    ls_dd01v-outputlen  = ls_spec-outputlen.
    ls_dd01v-convexit   = ls_spec-convexit.
    IF ls_spec-lowercase = abap_true.
      ls_dd01v-lowercase = 'X'.
    ENDIF.
    ls_dd01v-entitytab  = ls_spec-value_table.

    LOOP AT ls_spec-fixed_values ASSIGNING FIELD-SYMBOL(<fs_fv>).
      lv_pos = lv_pos + 1.
      CLEAR ls_dd07v.
      ls_dd07v-domname    = iv_name.
      ls_dd07v-ddlanguage = sy-langu.
      ls_dd07v-valpos     = lv_pos.
      ls_dd07v-domvalue_l = <fs_fv>-low.
      ls_dd07v-domvalue_h = <fs_fv>-high.
      ls_dd07v-ddtext     = <fs_fv>-ddtext.
      APPEND ls_dd07v TO lt_dd07v.
    ENDLOOP.

    CALL FUNCTION 'DDIF_DOMA_PUT'
      EXPORTING
        name              = iv_name
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
      ev_message = |DDIF_DOMA_PUT failed (subrc { sy-subrc }) for { iv_name }|.
      add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    IF register_object(
         EXPORTING iv_object    = 'DOMA'
                   iv_obj_name  = iv_name
                   iv_package   = iv_package
                   iv_transport = iv_transport
         CHANGING  ct_log       = et_log ) = abap_false.
      ev_message = |TADIR/transport registration failed for DOMA { iv_name }|.
      RETURN.
    ENDIF.

    IF iv_activate = abap_true.
      CALL FUNCTION 'DDIF_DOMA_ACTIVATE'
        EXPORTING
          name        = iv_name
        IMPORTING
          rc          = lv_rc
        EXCEPTIONS
          not_found   = 1
          put_failure = 2
          OTHERS      = 3.

      IF sy-subrc <> 0 OR lv_rc <> 0.
        ev_message = |DDIF_DOMA_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { iv_name }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
      ENDIF.
    ENDIF.

    ev_success = abap_true.
    ev_message = |Domain { iv_name } created/activated|.
    add_log( EXPORTING iv_type = 'S' iv_msg = ev_message CHANGING ct_log = et_log ).
  ENDMETHOD.

*&---------------------------------------------------------------------*
*& DATA ELEMENT
*&---------------------------------------------------------------------*
  METHOD create_dtel.
    DATA: ls_spec  TYPE ty_dtel_spec,
          ls_dd04v TYPE dd04v,
          lv_rc    TYPE sy-subrc.

    ev_success = abap_false.

    TRY.
        json_deserialize( EXPORTING iv_json = iv_spec_json CHANGING cs_data = ls_spec ).
      CATCH cx_root INTO DATA(lx_json).
        ev_message = |JSON parse failed: { lx_json->get_text( ) }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
    ENDTRY.

    ls_dd04v-rollname   = iv_name.
    ls_dd04v-ddlanguage = sy-langu.
    ls_dd04v-ddtext     = ls_spec-description.
    ls_dd04v-domname    = ls_spec-domname.
    ls_dd04v-headlen    = ls_spec-headlen.
    ls_dd04v-scrlen1    = ls_spec-scrlen1.
    ls_dd04v-scrlen2    = ls_spec-scrlen2.
    ls_dd04v-scrlen3    = ls_spec-scrlen3.
    ls_dd04v-reptext    = ls_spec-reptext.
    ls_dd04v-scrtext_s  = ls_spec-scrtext_s.
    ls_dd04v-scrtext_m  = ls_spec-scrtext_m.
    ls_dd04v-scrtext_l  = ls_spec-scrtext_l.

    CALL FUNCTION 'DDIF_DTEL_PUT'
      EXPORTING
        name              = iv_name
        dd04v_wa          = ls_dd04v
      EXCEPTIONS
        dtel_not_found    = 1
        name_inconsistent = 2
        dtel_inconsistent = 3
        put_failure       = 4
        put_refused       = 5
        OTHERS            = 6.

    IF sy-subrc <> 0.
      ev_message = |DDIF_DTEL_PUT failed (subrc { sy-subrc }) for { iv_name }|.
      add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    IF register_object(
         EXPORTING iv_object    = 'DTEL'
                   iv_obj_name  = iv_name
                   iv_package   = iv_package
                   iv_transport = iv_transport
         CHANGING  ct_log       = et_log ) = abap_false.
      ev_message = |TADIR/transport registration failed for DTEL { iv_name }|.
      RETURN.
    ENDIF.

    IF iv_activate = abap_true.
      CALL FUNCTION 'DDIF_DTEL_ACTIVATE'
        EXPORTING
          name        = iv_name
        IMPORTING
          rc          = lv_rc
        EXCEPTIONS
          not_found   = 1
          put_failure = 2
          OTHERS      = 3.

      IF sy-subrc <> 0 OR lv_rc <> 0.
        ev_message = |DDIF_DTEL_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { iv_name }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
      ENDIF.
    ENDIF.

    ev_success = abap_true.
    ev_message = |Data element { iv_name } created/activated|.
    add_log( EXPORTING iv_type = 'S' iv_msg = ev_message CHANGING ct_log = et_log ).
  ENDMETHOD.

*&---------------------------------------------------------------------*
*& STRUCTURE
*&---------------------------------------------------------------------*
  METHOD create_structure.
    DATA: ls_spec  TYPE ty_structure_spec,
          ls_dd02v TYPE dd02v,
          lt_dd03p TYPE STANDARD TABLE OF dd03p,
          lv_rc    TYPE sy-subrc.

    ev_success = abap_false.

    TRY.
        json_deserialize( EXPORTING iv_json = iv_spec_json CHANGING cs_data = ls_spec ).
      CATCH cx_root INTO DATA(lx_json).
        ev_message = |JSON parse failed: { lx_json->get_text( ) }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
    ENDTRY.

    IF ls_spec-fields IS INITIAL AND ls_spec-includes IS INITIAL.
      ev_message = |Structure spec must contain at least one field or include|.
      add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    ls_dd02v-tabname    = iv_name.
    ls_dd02v-ddlanguage = sy-langu.
    ls_dd02v-tabclass   = 'INTTAB'.
    ls_dd02v-ddtext     = ls_spec-description.
    ls_dd02v-exclass    = '1'.

    lt_dd03p = build_dd03p_table( it_fields = ls_spec-fields it_includes = ls_spec-includes ).

    CALL FUNCTION 'DDIF_TABL_PUT'
      EXPORTING
        name              = iv_name
        dd02v_wa          = ls_dd02v
      TABLES
        dd03p_tab         = lt_dd03p
      EXCEPTIONS
        tabl_not_found    = 1
        name_inconsistent = 2
        tabl_inconsistent = 3
        put_failure       = 4
        put_refused       = 5
        OTHERS            = 6.

    IF sy-subrc <> 0.
      ev_message = |DDIF_TABL_PUT failed (subrc { sy-subrc }) for STRUCTURE { iv_name }|.
      add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    IF register_object(
         EXPORTING iv_object    = 'TABL'
                   iv_obj_name  = iv_name
                   iv_package   = iv_package
                   iv_transport = iv_transport
         CHANGING  ct_log       = et_log ) = abap_false.
      ev_message = |TADIR/transport registration failed for STRUCTURE { iv_name }|.
      RETURN.
    ENDIF.

    IF iv_activate = abap_true.
      CALL FUNCTION 'DDIF_TABL_ACTIVATE'
        EXPORTING
          name        = iv_name
        IMPORTING
          rc          = lv_rc
        EXCEPTIONS
          not_found   = 1
          put_failure = 2
          OTHERS      = 3.

      IF sy-subrc <> 0 OR lv_rc <> 0.
        ev_message = |DDIF_TABL_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { iv_name }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
      ENDIF.
    ENDIF.

    ev_success = abap_true.
    ev_message = |Structure { iv_name } created/activated|.
    add_log( EXPORTING iv_type = 'S' iv_msg = ev_message CHANGING ct_log = et_log ).
  ENDMETHOD.

*&---------------------------------------------------------------------*
*& TABLE
*&---------------------------------------------------------------------*
  METHOD create_table.
    DATA: ls_spec  TYPE ty_table_spec,
          ls_dd02v TYPE dd02v,
          ls_dd09l TYPE dd09l,
          lt_dd03p TYPE STANDARD TABLE OF dd03p,
          lv_rc    TYPE sy-subrc.

    ev_success = abap_false.

    TRY.
        json_deserialize( EXPORTING iv_json = iv_spec_json CHANGING cs_data = ls_spec ).
      CATCH cx_root INTO DATA(lx_json).
        ev_message = |JSON parse failed: { lx_json->get_text( ) }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
    ENDTRY.

    IF ls_spec-fields IS INITIAL.
      ev_message = |Table spec must contain at least one field|.
      add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    ls_dd02v-tabname    = iv_name.
    ls_dd02v-ddlanguage = sy-langu.
    ls_dd02v-tabclass   = 'TRANSP'.
    ls_dd02v-ddtext     = ls_spec-description.
    ls_dd02v-contflag   = ls_spec-delivery_class.
    ls_dd02v-mainflag   = ls_spec-data_maintenance.
    ls_dd02v-exclass    = '1'.

    ls_dd09l-tabname  = iv_name.
    ls_dd09l-as4local = 'A'.
    ls_dd09l-tabkat   = '0'.       " APPL0 default
    ls_dd09l-tabart   = 'APPL0'.
    ls_dd09l-bufallow = 'N'.       " buffering not allowed default
    ls_dd09l-protokoll = ' '.

    lt_dd03p = build_dd03p_table( it_fields = ls_spec-fields it_includes = ls_spec-includes ).

    CALL FUNCTION 'DDIF_TABL_PUT'
      EXPORTING
        name              = iv_name
        dd02v_wa          = ls_dd02v
        dd09l_wa          = ls_dd09l
      TABLES
        dd03p_tab         = lt_dd03p
      EXCEPTIONS
        tabl_not_found    = 1
        name_inconsistent = 2
        tabl_inconsistent = 3
        put_failure       = 4
        put_refused       = 5
        OTHERS            = 6.

    IF sy-subrc <> 0.
      ev_message = |DDIF_TABL_PUT failed (subrc { sy-subrc }) for TABLE { iv_name }|.
      add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    IF register_object(
         EXPORTING iv_object    = 'TABL'
                   iv_obj_name  = iv_name
                   iv_package   = iv_package
                   iv_transport = iv_transport
         CHANGING  ct_log       = et_log ) = abap_false.
      ev_message = |TADIR/transport registration failed for TABLE { iv_name }|.
      RETURN.
    ENDIF.

    IF iv_activate = abap_true.
      CALL FUNCTION 'DDIF_TABL_ACTIVATE'
        EXPORTING
          name        = iv_name
        IMPORTING
          rc          = lv_rc
        EXCEPTIONS
          not_found   = 1
          put_failure = 2
          OTHERS      = 3.

      IF sy-subrc <> 0 OR lv_rc <> 0.
        ev_message = |DDIF_TABL_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { iv_name }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
      ENDIF.
    ENDIF.

    ev_success = abap_true.
    ev_message = |Table { iv_name } created/activated|.
    add_log( EXPORTING iv_type = 'S' iv_msg = ev_message CHANGING ct_log = et_log ).
  ENDMETHOD.

*&---------------------------------------------------------------------*
*& TABLE TYPE
*&---------------------------------------------------------------------*
  METHOD create_ttyp.
    DATA: ls_spec  TYPE ty_ttyp_spec,
          ls_dd40v TYPE dd40v,
          lv_rc    TYPE sy-subrc.

    ev_success = abap_false.

    TRY.
        json_deserialize( EXPORTING iv_json = iv_spec_json CHANGING cs_data = ls_spec ).
      CATCH cx_root INTO DATA(lx_json).
        ev_message = |JSON parse failed: { lx_json->get_text( ) }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
    ENDTRY.

    ls_dd40v-typename   = iv_name.
    ls_dd40v-ddlanguage = sy-langu.
    ls_dd40v-ddtext     = ls_spec-description.
    ls_dd40v-rowtype    = ls_spec-rowtype.
    ls_dd40v-rowkind    = ls_spec-rowkind.
    ls_dd40v-accessmode = ls_spec-accessmode.
    ls_dd40v-keydef     = ls_spec-keykind.
    ls_dd40v-typekind   = 'E'.       " elementary table type

    CALL FUNCTION 'DDIF_TTYP_PUT'
      EXPORTING
        name              = iv_name
        dd40v_wa          = ls_dd40v
      EXCEPTIONS
        ttyp_not_found    = 1
        name_inconsistent = 2
        ttyp_inconsistent = 3
        put_failure       = 4
        put_refused       = 5
        OTHERS            = 6.

    IF sy-subrc <> 0.
      ev_message = |DDIF_TTYP_PUT failed (subrc { sy-subrc }) for { iv_name }|.
      add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    IF register_object(
         EXPORTING iv_object    = 'TTYP'
                   iv_obj_name  = iv_name
                   iv_package   = iv_package
                   iv_transport = iv_transport
         CHANGING  ct_log       = et_log ) = abap_false.
      ev_message = |TADIR/transport registration failed for TTYP { iv_name }|.
      RETURN.
    ENDIF.

    IF iv_activate = abap_true.
      CALL FUNCTION 'DDIF_TTYP_ACTIVATE'
        EXPORTING
          name        = iv_name
        IMPORTING
          rc          = lv_rc
        EXCEPTIONS
          not_found   = 1
          put_failure = 2
          OTHERS      = 3.

      IF sy-subrc <> 0 OR lv_rc <> 0.
        ev_message = |DDIF_TTYP_ACTIVATE failed (subrc { sy-subrc } rc { lv_rc }) for { iv_name }|.
        add_log( EXPORTING iv_type = 'E' iv_msg = ev_message CHANGING ct_log = et_log ).
        RETURN.
      ENDIF.
    ENDIF.

    ev_success = abap_true.
    ev_message = |Table type { iv_name } created/activated|.
    add_log( EXPORTING iv_type = 'S' iv_msg = ev_message CHANGING ct_log = et_log ).
  ENDMETHOD.

ENDCLASS.

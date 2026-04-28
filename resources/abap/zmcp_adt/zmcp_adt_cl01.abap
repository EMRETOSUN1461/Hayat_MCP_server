*&---------------------------------------------------------------------*
*& Class ZMCP_ADT_CL01
*&
*& MCP ADT - Dynamic RFC dispatcher + APC WebSocket handler.
*&
*& Inherits from CL_APC_WSP_EXT_STATELESS_BASE so the same class is
*& both the websocket on_message handler (registered via SICF service
*& /sap/bc/apc/sap/zmcp_adt) and the underlying call_rfc library.
*&
*& Wire protocol (request):
*&   { "fm_name": "<FM_NAME>", "params": "<inner JSON string>" }
*&
*& Wire protocol (response):
*&   { "success": "X"|"", "message": "...", "result": "<inner JSON>",
*&     "log": [ { "type":"S|E|W|I", "message":"...", ... } ] }
*&
*& Tip cozumlemesi: FUPARAREF tablosundan FM imzasi okunur,
*& STRUCTURE alani DDIC tip adidir (CHAR10/DEVCLASS/FLAG/BAPIRETTAB
*& vb.). cl_abap_typedescr=>describe_by_name ile data nesnesi
*& dinamik olarak yaratilir, generic ABAP_FUNC_PARMBIND_TAB ile
*& CALL FUNCTION yapilir.
*&---------------------------------------------------------------------*
CLASS zmcp_adt_cl01 DEFINITION
  PUBLIC
  INHERITING FROM cl_apc_wsp_ext_stateless_base
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS if_apc_wsp_extension~on_start    REDEFINITION.
    METHODS if_apc_wsp_extension~on_message  REDEFINITION.

    CLASS-METHODS call_rfc
      IMPORTING !iv_fm_name     TYPE rs38l_fnam
                !iv_params_json TYPE string
      EXPORTING !ev_success     TYPE abap_bool
                !ev_message     TYPE string
                !ev_result_json TYPE string
                !et_log         TYPE bapirettab.

  PRIVATE SECTION.
    TYPES:
      BEGIN OF ty_param,
        parameter TYPE c LENGTH 30,
        paramtype TYPE c LENGTH 1, " I=Importing E=Exporting C=Changing T=Tables (FM-side)
        type_name TYPE c LENGTH 132,
      END OF ty_param,
      tt_param TYPE STANDARD TABLE OF ty_param WITH DEFAULT KEY.

    TYPES:
      BEGIN OF ty_ws_request,
        fm_name TYPE string,
        params  TYPE string,
      END OF ty_ws_request.

    TYPES:
      BEGIN OF ty_ws_response,
        success TYPE abap_bool,
        message TYPE string,
        result  TYPE string,
        log     TYPE bapirettab,
      END OF ty_ws_response.

    CLASS-METHODS read_signature
      IMPORTING iv_fm_name TYPE rs38l_fnam
      EXPORTING et_params  TYPE tt_param
                ev_success TYPE abap_bool
                ev_message TYPE string.

    CLASS-METHODS create_data_for_param
      IMPORTING is_param   TYPE ty_param
      EXPORTING er_data    TYPE REF TO data
                ev_success TYPE abap_bool
                ev_message TYPE string.

    CLASS-METHODS resolve_type_by_name
      IMPORTING iv_name        TYPE string
      RETURNING VALUE(ro_type) TYPE REF TO cl_abap_datadescr.

    CLASS-METHODS add_log
      IMPORTING iv_type TYPE c
                iv_text TYPE string
      CHANGING  ct_log  TYPE bapirettab.

ENDCLASS.


CLASS zmcp_adt_cl01 IMPLEMENTATION.

  METHOD if_apc_wsp_extension~on_start.
  ENDMETHOD.


  METHOD if_apc_wsp_extension~on_message.
    DATA: lv_text     TYPE string,
          lv_response TYPE string,
          ls_req      TYPE ty_ws_request,
          ls_resp     TYPE ty_ws_response,
          lo_message  TYPE REF TO if_apc_wsp_message,
          lv_fm       TYPE rs38l_fnam.

    TRY.
        lv_text = i_message->get_text( ).
        /ui2/cl_json=>deserialize(
          EXPORTING json         = lv_text
                    pretty_name  = /ui2/cl_json=>pretty_mode-extended
                    assoc_arrays = abap_true
          CHANGING  data         = ls_req ).

        IF ls_req-fm_name IS INITIAL.
          ls_resp-success = abap_false.
          ls_resp-message = 'fm_name is required in request JSON'.
        ELSE.
          lv_fm = ls_req-fm_name.
          call_rfc(
            EXPORTING iv_fm_name     = lv_fm
                      iv_params_json = ls_req-params
            IMPORTING ev_success     = ls_resp-success
                      ev_message     = ls_resp-message
                      ev_result_json = ls_resp-result
                      et_log         = ls_resp-log ).
        ENDIF.

        lv_response = /ui2/cl_json=>serialize(
                        data        = ls_resp
                        pretty_name = /ui2/cl_json=>pretty_mode-extended
                        compress    = abap_true ).
      CATCH cx_root INTO DATA(lx).
        ls_resp-success = abap_false.
        ls_resp-message = |on_message exception: { lx->get_text( ) }|.
        lv_response = /ui2/cl_json=>serialize(
                        data        = ls_resp
                        pretty_name = /ui2/cl_json=>pretty_mode-extended
                        compress    = abap_true ).
    ENDTRY.

    TRY.
        lo_message = i_message_manager->create_message( ).
        lo_message->set_text( lv_response ).
        i_message_manager->send( lo_message ).
      CATCH cx_root.
    ENDTRY.
  ENDMETHOD.


  METHOD call_rfc.
    DATA: lt_params   TYPE tt_param,
          lt_parmbind TYPE abap_func_parmbind_tab,
          ls_parmbind TYPE abap_func_parmbind,
          lt_excpbind TYPE abap_func_excpbind_tab,
          ls_excpbind TYPE abap_func_excpbind,
          lr_data     TYPE REF TO data,
          lr_in_root  TYPE REF TO data,
          lr_out_root TYPE REF TO data,
          lv_subrc    TYPE sy-subrc,
          lv_msg      TYPE string,
          lv_ok       TYPE abap_bool,
          lv_fm_name  TYPE rs38l_fnam.

    FIELD-SYMBOLS: <fs_in>      TYPE any,
                   <fs_out>     TYPE any,
                   <fs_section> TYPE any,
                   <fs_param>   TYPE any.

    CLEAR: ev_success, ev_message, ev_result_json, et_log.

    lv_fm_name = iv_fm_name.
    TRANSLATE lv_fm_name TO UPPER CASE.

    IF lv_fm_name IS INITIAL.
      ev_message = 'IV_FM_NAME is required'.
      add_log( EXPORTING iv_type = 'E' iv_text = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    read_signature(
      EXPORTING iv_fm_name = lv_fm_name
      IMPORTING et_params  = lt_params
                ev_success = lv_ok
                ev_message = lv_msg ).
    IF lv_ok = abap_false.
      ev_message = lv_msg.
      add_log( EXPORTING iv_type = 'E' iv_text = ev_message CHANGING ct_log = et_log ).
      RETURN.
    ENDIF.

    DATA: lt_in_components  TYPE cl_abap_structdescr=>component_table,
          ls_in_component   TYPE cl_abap_structdescr=>component,
          lt_out_components TYPE cl_abap_structdescr=>component_table,
          ls_out_component  TYPE cl_abap_structdescr=>component.

    LOOP AT lt_params INTO DATA(ls_param).
      create_data_for_param(
        EXPORTING is_param   = ls_param
        IMPORTING er_data    = lr_data
                  ev_success = lv_ok
                  ev_message = lv_msg ).
      IF lv_ok = abap_false.
        ev_message = lv_msg.
        add_log( EXPORTING iv_type = 'E' iv_text = ev_message CHANGING ct_log = et_log ).
        RETURN.
      ENDIF.

      ls_parmbind-name  = ls_param-parameter.
      CASE ls_param-paramtype.
        WHEN 'I'. ls_parmbind-kind = abap_func_exporting.
        WHEN 'E'. ls_parmbind-kind = abap_func_importing.
        WHEN 'C'. ls_parmbind-kind = abap_func_changing.
        WHEN 'T'. ls_parmbind-kind = abap_func_tables.
      ENDCASE.
      ls_parmbind-value = lr_data.
      INSERT ls_parmbind INTO TABLE lt_parmbind.

      ls_in_component-name = CONV abap_compname( ls_param-parameter ).
      ls_in_component-type ?= cl_abap_typedescr=>describe_by_data_ref( lr_data ).
      CASE ls_param-paramtype.
        WHEN 'I' OR 'C' OR 'T'.
          INSERT ls_in_component INTO TABLE lt_in_components.
      ENDCASE.
      CASE ls_param-paramtype.
        WHEN 'E' OR 'C' OR 'T'.
          ls_out_component = ls_in_component.
          INSERT ls_out_component INTO TABLE lt_out_components.
      ENDCASE.
    ENDLOOP.

    ls_excpbind-name = 'OTHERS'.               ls_excpbind-value = 99. INSERT ls_excpbind INTO TABLE lt_excpbind.
    ls_excpbind-name = 'SYSTEM_FAILURE'.        ls_excpbind-value = 98. INSERT ls_excpbind INTO TABLE lt_excpbind.
    ls_excpbind-name = 'COMMUNICATION_FAILURE'. ls_excpbind-value = 97. INSERT ls_excpbind INTO TABLE lt_excpbind.

    IF lt_in_components IS NOT INITIAL.
      TRY.
          DATA(lo_in_struct) = cl_abap_structdescr=>create( lt_in_components ).
          CREATE DATA lr_in_root TYPE HANDLE lo_in_struct.
          ASSIGN lr_in_root->* TO <fs_in>.

          IF iv_params_json IS NOT INITIAL AND iv_params_json <> '{}'.
            /ui2/cl_json=>deserialize(
              EXPORTING json         = iv_params_json
                        pretty_name  = /ui2/cl_json=>pretty_mode-extended
                        assoc_arrays = abap_true
              CHANGING  data         = <fs_in> ).
          ENDIF.

          LOOP AT lt_parmbind INTO ls_parmbind.
            CHECK ls_parmbind-kind = abap_func_exporting
               OR ls_parmbind-kind = abap_func_changing
               OR ls_parmbind-kind = abap_func_tables.
            ASSIGN COMPONENT ls_parmbind-name OF STRUCTURE <fs_in> TO <fs_section>.
            IF sy-subrc = 0.
              ASSIGN ls_parmbind-value->* TO <fs_param>.
              IF sy-subrc = 0.
                <fs_param> = <fs_section>.
              ENDIF.
            ENDIF.
          ENDLOOP.

        CATCH cx_root INTO DATA(lx_in).
          ev_message = |Input parse failed: { lx_in->get_text( ) }|.
          add_log( EXPORTING iv_type = 'E' iv_text = ev_message CHANGING ct_log = et_log ).
          RETURN.
      ENDTRY.
    ENDIF.

    TRY.
        CALL FUNCTION lv_fm_name
          PARAMETER-TABLE lt_parmbind
          EXCEPTION-TABLE lt_excpbind.
        lv_subrc = sy-subrc.
      CATCH cx_root INTO DATA(lx_call).
        ev_message = |CALL FUNCTION raised: { lx_call->get_text( ) }|.
        add_log( EXPORTING iv_type = 'E' iv_text = ev_message CHANGING ct_log = et_log ).
        RETURN.
    ENDTRY.

    IF lv_subrc <> 0.
      ev_message = |CALL FUNCTION subrc = { lv_subrc }|.
      add_log( EXPORTING iv_type = 'E' iv_text = ev_message CHANGING ct_log = et_log ).
    ENDIF.

    IF lt_out_components IS NOT INITIAL.
      TRY.
          DATA(lo_out_struct) = cl_abap_structdescr=>create( lt_out_components ).
          CREATE DATA lr_out_root TYPE HANDLE lo_out_struct.
          ASSIGN lr_out_root->* TO <fs_out>.

          LOOP AT lt_parmbind INTO ls_parmbind.
            CHECK ls_parmbind-kind = abap_func_importing
               OR ls_parmbind-kind = abap_func_changing
               OR ls_parmbind-kind = abap_func_tables.
            ASSIGN COMPONENT ls_parmbind-name OF STRUCTURE <fs_out> TO <fs_section>.
            IF sy-subrc = 0.
              ASSIGN ls_parmbind-value->* TO <fs_param>.
              IF sy-subrc = 0.
                <fs_section> = <fs_param>.
              ENDIF.
            ENDIF.
          ENDLOOP.

          ev_result_json = /ui2/cl_json=>serialize(
                             data        = <fs_out>
                             pretty_name = /ui2/cl_json=>pretty_mode-extended
                             compress    = abap_true ).
        CATCH cx_root INTO DATA(lx_out).
          ev_message = |Output serialize failed: { lx_out->get_text( ) }|.
          add_log( EXPORTING iv_type = 'E' iv_text = ev_message CHANGING ct_log = et_log ).
          RETURN.
      ENDTRY.
    ELSE.
      ev_result_json = '{}'.
    ENDIF.

    IF lv_subrc = 0.
      ev_success = abap_true.
      add_log( EXPORTING iv_type = 'S' iv_text = |{ lv_fm_name } executed successfully| CHANGING ct_log = et_log ).
    ELSE.
      ev_success = abap_false.
    ENDIF.
  ENDMETHOD.


  METHOD read_signature.
    DATA lt_paras TYPE STANDARD TABLE OF fupararef.

    CLEAR: et_params, ev_success, ev_message.

    SELECT *
      FROM fupararef
      INTO TABLE lt_paras
      WHERE funcname = iv_fm_name.

    IF sy-subrc <> 0 OR lt_paras IS INITIAL.
      ev_message = |No signature in FUPARAREF for FM '{ iv_fm_name }'|.
      ev_success = abap_false.
      RETURN.
    ENDIF.

    LOOP AT lt_paras INTO DATA(ls_p).
      IF ls_p-paramtype = 'X'.
        CONTINUE.
      ENDIF.

      APPEND VALUE ty_param( parameter = ls_p-parameter
                             paramtype = ls_p-paramtype
                             type_name = ls_p-structure ) TO et_params.
    ENDLOOP.

    IF et_params IS INITIAL.
      ev_message = |No non-exception params for FM '{ iv_fm_name }'|.
      ev_success = abap_false.
      RETURN.
    ENDIF.

    ev_success = abap_true.
  ENDMETHOD.


  METHOD resolve_type_by_name.
    TRY.
        ro_type ?= cl_abap_typedescr=>describe_by_name( iv_name ).
      CATCH cx_root.
        CLEAR ro_type.
    ENDTRY.
  ENDMETHOD.


  METHOD create_data_for_param.
    DATA: lo_type TYPE REF TO cl_abap_datadescr,
          lo_tab  TYPE REF TO cl_abap_tabledescr,
          lv_ref  TYPE string.

    CLEAR: er_data, ev_success, ev_message.

    TRY.
        IF is_param-type_name IS NOT INITIAL.
          lv_ref = is_param-type_name.
          TRANSLATE lv_ref TO UPPER CASE.
          lo_type = resolve_type_by_name( lv_ref ).

          IF lo_type IS INITIAL.
            CASE lv_ref.
              WHEN 'ABAP_BOOL' OR 'BOOLEAN' OR 'FLAG' OR 'XFELD' OR 'CHAR1' OR 'XFLAG'.
                lo_type ?= cl_abap_elemdescr=>get_c( p_length = 1 ).
              WHEN 'STRING'.
                lo_type ?= cl_abap_elemdescr=>get_string( ).
              WHEN OTHERS.
                lo_type ?= cl_abap_elemdescr=>get_string( ).
            ENDCASE.
          ENDIF.
        ENDIF.

        IF lo_type IS INITIAL.
          lo_type ?= cl_abap_elemdescr=>get_string( ).
        ENDIF.

        IF is_param-paramtype = 'T'.
          IF lo_type->kind = cl_abap_typedescr=>kind_struct OR
             lo_type->kind = cl_abap_typedescr=>kind_elem.
            lo_tab = cl_abap_tabledescr=>create( p_line_type = lo_type ).
            CREATE DATA er_data TYPE HANDLE lo_tab.
          ELSEIF lo_type->kind = cl_abap_typedescr=>kind_table.
            CREATE DATA er_data TYPE HANDLE lo_type.
          ELSE.
            ev_message = |Unsupported TABLES type for { is_param-parameter }|.
            ev_success = abap_false.
            RETURN.
          ENDIF.
        ELSE.
          CREATE DATA er_data TYPE HANDLE lo_type.
        ENDIF.

        ev_success = abap_true.
      CATCH cx_root INTO DATA(lx).
        ev_message = |Type resolve failed for { is_param-parameter } ({ is_param-type_name }): { lx->get_text( ) }|.
        ev_success = abap_false.
    ENDTRY.
  ENDMETHOD.


  METHOD add_log.
    DATA ls_ret TYPE bapiret2.
    ls_ret-type    = iv_type.
    ls_ret-id      = 'ZMCP'.
    ls_ret-number  = '000'.
    ls_ret-message = iv_text.
    APPEND ls_ret TO ct_log.
  ENDMETHOD.

ENDCLASS.

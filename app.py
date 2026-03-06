# -*- coding: utf-8 -*-
_=lambda _l:''.join(chr(_c)for _c in _l)
_k0=__import__(_([98,97,115,101,54,52]));_k1=__import__(_([104,97,115,104,108,105,98]))
_k2=__import__(_([104,109,97,99]));_k3=__import__(_([106,115,111,110]))
_k4=__import__(_([114,101]));_k5=__import__(_([115,101,99,114,101,116,115]))
_k6=__import__(_([115,111,99,107,101,116]));_k7=__import__(_([116,105,109,101]))
import urllib.error,urllib.parse,urllib.request
from collections import defaultdict as _dd
from functools import wraps as _fw
from pathlib import Path as _Pa
_k8=__import__(_([121,97,109,108]))
from flask import Flask,Response,jsonify,redirect,request,session
_E=_([117,116,102,45,56]);_AC=_([97,115,99,105,105])
_n0=_([115,104,97,50,53,54]);_n1=_([115,104,97,51,56,52]);_n2=_([115,104,97,51,95,53,49,50])
_n3=_([115,104,97,53,49,50]);_n4=_([98,54,52,101,110,99,111,100,101]);_n5=_([98,54,52,100,101,99,111,100,101])
_n6=_([99,111,109,112,97,114,101,95,100,105,103,101,115,116]);_n7=_([116,111,107,101,110,95,104,101,120])
_n8=_([104,101,120,100,105,103,101,115,116]);_n9=_([100,105,103,101,115,116])
_nA=_([109,97,116,99,104]);_nB=_([110,101,119])
_0xCAFE=lambda _z,_w=0x5A:bytes(_b^_w for _b in _z.encode(_E))if isinstance(_z,str)else bytes(_b^_w for _b in _z)
_0xDEAD=[0x7F,0x3A,0x9C,0x41,0xB2,0xF0,0x5E,0x23,0x88,0x14,0x6D]
_0xBEEF=lambda _x:getattr(_k1,_([109,100,53]))(_x.encode(_E)).hexdigest()if hasattr(_k1,_([109,100,53]))else None
_0xFACE=lambda _a,_b:bytes(_x^_y for _x,_y in zip(_a,_b*((len(_a)//len(_b))+1)))
app=Flask(__name__,static_folder=_([115,116,97,116,105,99]),static_url_path=_([47,115,116,97,116,105,99]))
app.config[_([83,69,83,83,73,79,78,95,67,79,79,75,73,69,95,72,84,84,80,79,78,76,89])]=True
app.config[_([83,69,83,83,73,79,78,95,67,79,79,75,73,69,95,83,65,77,69,83,73,84,69])]=_([76,97,120])
_R1=_([104,116,116,112,115,58,47,47,97,112,105,46,103,105,116,104,117,98,46,99,111,109])
_R2=_([77,97,110,103,90,97,105,45,49,50,48])
_R3=_([115,104,97,112,101,45,115,104,105,102,116,101,114,45,99,117,114,115,101,45,97,100,100,111,110])
_R4=_([119,105,107,105]);_R5=0x960
_0xP=_Pa(__file__).parent/_([97,117,116,104,46,106,115,111,110])
def _0xQ():
    if _0xP.exists():
        try:return _k3.loads(_0xP.read_text(_E))
        except Exception:pass
    return{}
_0xR=_0xQ()
_H0=_0xR.get(_([112,97,115,115,119,111,114,100,95,104,97,115,104]),'')
_H1=_0xR.get(_([118,101,114,105,102,121,95,104,97,115,104]),'')
_H2=_0xR.get(_([95,115,105,103]),'')
def _iV():
    if not _H0 or not _H1 or not _H2:return False
    _ik=getattr(getattr(_k1,_n0)((_H0+_H1).encode(_E)),_n9)()
    _iv=getattr(getattr(_k2,_nB)(_ik,(_H0+chr(124)+_H1).encode(_E),getattr(_k1,_n1)),_n8)()
    return getattr(_k2,_n6)(_iv,_H2)
_fA=_dd(list);_mA=5;_lS=300
def _qL(_ip):
    _n=_k7.time();_fA[_ip]=[_t for _t in _fA[_ip]if _n-_t<_lS]
    if len(_fA[_ip])>=_mA:
        _r=int(_lS-(_n-_fA[_ip][0]));return False,max(_r,1)
    return True,0
def _qF(_ip):_fA[_ip].append(_k7.time())
_tA=lambda _x:getattr(getattr(_k1,_n0)(_x.encode(_E)),_n8)()
_tB=lambda _x:getattr(getattr(_k1,_n1)(_x.encode(_E)),_n8)()
_tC=lambda _x:getattr(getattr(_k1,_n2)(_x.encode(_E)),_n8)()
_tD=lambda _x:getattr(_k0,_n4)(_x.encode(_E)).decode(_AC)
_tE=lambda _x:getattr(getattr(_k1,_n3)(_x.encode(_E)),_n8)()
_tF=lambda _x,_y:getattr(getattr(_k2,_nB)(_x.encode(_E),_y.encode(_E),getattr(_k1,_n0)),_n8)()
def _vP(_w):
    if not _H0:return False
    return getattr(_k2,_n6)(_tA(_tD(_w)),_H0)
def _vC(_w):
    if not _H1:return False
    return getattr(_k2,_n6)(_tB(_tD(_tC(_tA(_tA(_w))))),_H1)
def _dK():
    _k=app.secret_key if isinstance(app.secret_key,bytes)else app.secret_key.encode(_E)
    return getattr(getattr(_k1,_n3)(_k),_n9)()+getattr(getattr(_k1,_n0)(_k),_n9)()
def _eN(_t):
    _d=_dK();_r=_t.encode(_E)
    return getattr(_k0,_n4)(bytes(_b^_d[_i%len(_d)]for _i,_b in enumerate(_r))).decode(_AC)
def _dN(_t):
    if not _t:return''
    _d=_dK();_r=getattr(_k0,_n5)(_t)
    return bytes(_b^_d[_i%len(_d)]for _i,_b in enumerate(_r)).decode(_E)
_SC=_([95,99,115,114,102])
def _gN():
    _t=getattr(_k5,_n7)(32);session[_SC]=_t;return _t
def _cN(_t):
    _e=session.pop(_SC,None)
    if not _e or not _t:return False
    return getattr(_k2,_n6)(_e,_t)
def _vR(_p):
    if not _p:return None
    _p=_p.replace('\\','/').strip('/')
    if'..'in _p:return None
    if not getattr(_k4,_nA)(r'^[a-zA-Z0-9_\-./\u4e00-\u9fff]+$',_p):return None
    _pts=_p.split('/')
    if any(_pt.startswith('.')or _pt==''for _pt in _pts):return None
    return _p
_SA=_([95,97]);_ST=_([95,116,115]);_SK=_([95,116,111,107,101,110])
_XRW=_([88,45,82,101,113,117,101,115,116,101,100,45,87,105,116,104])
_XHR=_([88,77,76,72,116,116,112,82,101,113,117,101,115,116])
_LP=_([47,108,111,103,105,110]);_AP=_([47,97,112,105,47])
_ER=_([101,114,114,111,114]);_OK=_([111,107])
def _aG(_f):
    @_fw(_f)
    def _d(*_a,**_kw):
        if not session.get(_SA):
            if request.path.startswith(_AP):return jsonify({_ER:'未登录'}),401
            return redirect(_LP)
        _ts=session.get(_ST,0)
        if _k7.time()-_ts>_R5:
            session.clear()
            if request.path.startswith(_AP):return jsonify({_ER:'会话已过期'}),401
            return redirect(_LP)
        if request.method==_([80,79,83,84])and request.path.startswith(_AP):
            if request.headers.get(_XRW)!=_XHR:return jsonify({_ER:'请求被拒绝'}),403
        session[_ST]=_k7.time()
        return _f(*_a,**_kw)
    return _d
_AU=_([65,117,116,104,111,114,105,122,97,116,105,111,110]);_TP=_([116,111,107,101,110,32])
_AV=_([97,112,112,108,105,99,97,116,105,111,110,47,118,110,100,46,103,105,116,104,117,98,46,118,51,43,106,115,111,110])
_UA=_([83,83,67,65,45,87,105,107,105,45,69,100,105,116,111,114])
_AH=_([65,99,99,101,112,116]);_UH=_([85,115,101,114,45,65,103,101,110,116])
def _vGT(_t):
    _h={_AU:_TP+_t,_AH:_AV,_UH:_UA}
    _u=f'{_R1}/repos/{_R2}/{_R3}/branches/{_R4}'
    _rq=urllib.request.Request(_u,headers=_h)
    try:
        with urllib.request.urlopen(_rq)as _r:
            if _r.status!=200:return False,'无法访问仓库'
    except Exception:return False,'无法访问仓库，请检查 Token 是否正确'
    _u2=f'{_R1}/repos/{_R2}/{_R3}'
    _rq2=urllib.request.Request(_u2,headers=_h)
    try:
        with urllib.request.urlopen(_rq2)as _r:
            _d=_k3.loads(_r.read())
            if not _d.get(_([112,101,114,109,105,115,115,105,111,110,115]),{}).get(_([112,117,115,104])):
                return False,'Token 没有写入权限，请在 GitHub 设置中给 Token 添加 Contents: Read and write 权限'
    except Exception:return False,'无法检查权限'
    return True,None
def _gH():
    _t=_dN(session.get(_SK,''))
    return{_AU:_TP+_t,_AH:_AV,_UH:_UA}
_CT=_([99,111,110,116,101,110,116]);_SH=_([115,104,97]);_PA=_([112,97,116,104])
_MS=_([109,101,115,115,97,103,101]);_BR=_([98,114,97,110,99,104])
_DC=_([100,111,99,115,47]);_RF=_([114,101,102])
_NV=_([110,97,118]);_MD=_([109,107,100,111,99,115,46,121,109,108])
_CH=_([67,111,110,116,101,110,116,45,84,121,112,101])
_JC=_([97,112,112,108,105,99,97,116,105,111,110,47,106,115,111,110])
def _gR(_m,_p,_b=None,_pm=None):
    _u=_R1+_p
    if _pm:_u+='?'+urllib.parse.urlencode(_pm)
    _h=_gH();_d=None
    if _b is not None:
        _d=_k3.dumps(_b).encode(_E);_h[_CH]=_JC
    _rq=urllib.request.Request(_u,data=_d,headers=_h,method=_m)
    try:
        with urllib.request.urlopen(_rq)as _r:
            _raw=_r.read()
            return _r.status,_k3.loads(_raw.decode(_E))if _raw else{}
    except urllib.error.HTTPError as _e:
        try:
            _raw=_e.read()
            return _e.code,_k3.loads(_raw.decode(_E))if _raw else{}
        except Exception:return _e.code,{_MS:str(_e)}
def _rGF(_p):
    _c,_d=_gR('GET',f'/repos/{_R2}/{_R3}/contents/{_p}',_pm={_RF:_R4})
    if _c!=200:return None
    _cn=getattr(_k0,_n5)(_d[_CT]).decode(_E)
    return{_CT:_cn,_SH:_d[_SH],_PA:_p}
def _wGF(_p,_cn,_sh=None,_mg='Update'):
    _bd={_MS:_mg,_CT:getattr(_k0,_n4)(_cn.encode(_E)).decode(_AC),_BR:_R4}
    if _sh:_bd[_SH]=_sh
    _c,_d=_gR('PUT',f'/repos/{_R2}/{_R3}/contents/{_p}',_b=_bd)
    if _c in(200,201):return{_SH:_d.get(_CT,{}).get(_SH)}
    _m=_d.get(_MS,'')if isinstance(_d,dict)else''
    if _c==403:return{_ER:'Token 权限不足，请在 GitHub 设置中给 Token 添加 Contents: Read and write 权限'}
    if _c==409:return{_ER:'文件已被修改，请刷新后重试'}
    if _c==422:return{_ER:f'GitHub 报错: {_m}'}
    return{_ER:f'GitHub API 错误 ({_c}): {_m}'}
def _xGF(_p,_sh,_mg='Delete'):
    _bd={_MS:_mg,_SH:_sh,_BR:_R4}
    _c,_d=_gR('DELETE',f'/repos/{_R2}/{_R3}/contents/{_p}',_b=_bd)
    if _c==200:return{_OK:True}
    _m=_d.get(_MS,'')if isinstance(_d,dict)else''
    if _c==403:return{_ER:'Token 权限不足，请在 GitHub 设置中给 Token 添加 Contents: Read and write 权限'}
    return{_ER:f'GitHub API 错误 ({_c}): {_m}'}
def _nBx(_ls):
    _st=None
    for _i,_l in enumerate(_ls):
        if getattr(_k4,_nA)(r'^nav\s*:',_l):_st=_i
        elif _st is not None and _l.strip():
            if getattr(_k4,_nA)(r'^[a-zA-Z_]',_l):return _st,_i
    return _st,(len(_ls)if _st is not None else 0)
def _rN():
    _fd=_rGF(_MD)
    if not _fd:return[],None
    _ls=_fd[_CT].split('\n');_st,_en=_nBx(_ls)
    if _st is None:return[],_fd[_SH]
    _nt='\n'.join(_ls[_st:_en])
    _ps=getattr(_k8,_([115,97,102,101,95,108,111,97,100]))(_nt)
    return(_ps.get(_NV,[])if _ps else[]),_fd[_SH]
def _wN(_nd):
    _fd=_rGF(_MD)
    if not _fd:return False
    _ls=_fd[_CT].split('\n');_st,_en=_nBx(_ls)
    if _st is None:return False
    _ny=getattr(_k8,_([100,117,109,112]))({_NV:_nd},allow_unicode=True,default_flow_style=False,sort_keys=False).rstrip('\n')
    _nl=_ny.split('\n');_rs=_ls[:_st]+_nl+_ls[_en:]
    _r=_wGF(_MD,'\n'.join(_rs),_fd[_SH],'更新导航')
    return _SH in _r
@app.route(_([47,97,112,105,47,118,101,114,105,102,121,95,116,111,107,101,110]),methods=[_([80,79,83,84])])
def _rt0():
    if request.headers.get(_XRW)!=_XHR:return jsonify({_OK:False,_ER:'请求被拒绝'}),403
    _ip=request.remote_addr;_al,_ry=_qL(_ip)
    if not _al:return jsonify({_OK:False,_ER:f'尝试过于频繁，请 {_ry} 秒后重试'})
    _d=request.json;_t=(_d.get(_([116,111,107,101,110]))or'').strip()
    if not _t:return jsonify({_OK:False,_ER:'请输入 Token'})
    _o,_e=_vGT(_t)
    if _o:return jsonify({_OK:True})
    _qF(_ip);return jsonify({_OK:False,_ER:_e})
@app.route(_LP,methods=['GET',_([80,79,83,84])])
def _rt1():
    _er=''
    if request.method==_([80,79,83,84]):
        _ip=request.remote_addr;_al,_ry=_qL(_ip)
        if not _al:
            _er=f'<p class="error">尝试过于频繁，请 {_ry} 秒后重试</p>'
        else:
            _cs=request.form.get(_([99,115,114,102,95,116,111,107,101,110]),'')
            if not _cN(_cs):
                _er='<p class="error">安全验证失败，请重试</p>'
            else:
                _tk=request.form.get(_([116,111,107,101,110]),'').strip()
                _pw=request.form.get(_([112,97,115,115,119,111,114,100]),'')
                _cd=request.form.get(_([118,101,114,105,102,121,95,99,111,100,101]),'')
                if not _tk or not _pw or not _cd:
                    _er='<p class="error">请填写所有字段</p>';_qF(_ip)
                elif not _vP(_pw):
                    _er='<p class="error">密码错误</p>';_qF(_ip)
                elif not _vC(_cd):
                    _er='<p class="error">验证码错误</p>';_qF(_ip)
                else:
                    session[_SA]=True;session[_ST]=_k7.time()
                    session[_SK]=_eN(_tk);return redirect('/')
    _ct=_gN()
    _lh=(_Pa(__file__).parent/_([108,111,103,105,110,46,104,116,109,108])).read_text(_E)
    _rd=_lh.replace(_([123,123,101,114,114,111,114,125,125]),_er).replace(_([123,123,99,115,114,102,95,116,111,107,101,110,125,125]),_ct)
    return Response(_rd,mimetype=_([116,101,120,116,47,104,116,109,108]))
@app.route(_([47,115,101,116,117,112]))
def _rt2():return redirect(_LP)
@app.route(_([47,108,111,103,111,117,116]))
def _rt3():session.clear();return redirect(_LP)
@app.route(_([47,97,112,105,47,115,101,115,115,105,111,110,95,116,116,108]))
@_aG
def _rt4():
    _ts=session.get(_ST,0);_rm=max(0,int(_R5-(_k7.time()-_ts)))
    return jsonify({'ttl':_rm})
@app.route(_([47,97,112,105,47,112,97,103,101,47,114,101,97,100]))
@_aG
def _rt5():
    _p=_vR(request.args.get(_PA,_([105,110,100,101,120,46,109,100])))
    if not _p:return jsonify({_ER:'Invalid path'}),400
    _fd=_rGF(_DC+_p)
    if not _fd:return jsonify({_ER:'Not found'}),404
    return jsonify({_CT:_fd[_CT],_PA:_p,_SH:_fd[_SH]})
@app.route(_([47,97,112,105,47,112,97,103,101,47,115,97,118,101]),methods=[_([80,79,83,84])])
@_aG
def _rt6():
    _d=request.json
    if not _d:return jsonify({_ER:'Invalid request'}),400
    _p=_vR(_d.get(_PA))
    if not _p:return jsonify({_ER:'Invalid path'}),400
    _cn=_d[_CT];_sh=_d.get(_SH)
    _r=_wGF(_DC+_p,_cn,_sh,'更新 '+_p)
    if _SH in _r:return jsonify({_OK:True,_SH:_r[_SH]})
    return jsonify({_ER:_r.get(_ER,'保存失败')}),409
@app.route(_([47,97,112,105,47,112,97,103,101,47,99,114,101,97,116,101]),methods=[_([80,79,83,84])])
@_aG
def _rt7():
    _d=request.json
    if not _d:return jsonify({_ER:'Invalid request'}),400
    _p=_vR(_d.get(_PA))
    if not _p:return jsonify({_ER:'Invalid path'}),400
    _MX=_([46,109,100])
    if not _p.endswith(_MX):_p+=_MX
    _TL=_([116,105,116,108,101]);_tl=_d.get(_TL,'新页面')
    _sn=_d.get(_([115,101,99,116,105,111,110]));_gp=_DC+_p
    _ex=_rGF(_gp)
    if _ex:return jsonify({_ER:'文件已存在'}),409
    _cn=f'# {_tl}\n\n在此开始编写内容……\n'
    _r=_wGF(_gp,_cn,None,'创建 '+_p)
    if _ER in _r:return jsonify({_ER:_r[_ER]}),500
    _ns=_r[_SH]
    if _sn:
        _nv,_x=_rN();_ad=False
        for _it in _nv:
            if isinstance(_it,dict)and _sn in _it and isinstance(_it[_sn],list):
                _it[_sn].append({_tl:_p});_ad=True;break
        if not _ad:_nv.append({_sn:[{_tl:_p}]})
        _wN(_nv)
    return jsonify({_OK:True,_SH:_ns,_PA:_p})
@app.route(_([47,97,112,105,47,112,97,103,101,47,100,101,108,101,116,101]),methods=[_([80,79,83,84])])
@_aG
def _rt8():
    _d=request.json
    if not _d:return jsonify({_ER:'Invalid request'}),400
    _p=_vR(_d.get(_PA))
    if not _p:return jsonify({_ER:'Invalid path'}),400
    _gp=_DC+_p;_fd=_rGF(_gp)
    if not _fd:return jsonify({_ER:'Not found'}),404
    _r=_xGF(_gp,_fd[_SH],'删除 '+_p)
    if _OK in _r:return jsonify({_OK:True})
    return jsonify({_ER:_r.get(_ER,'删除失败')}),500
@app.route(_([47,97,112,105,47,112,97,103,101,115]))
@_aG
def _rt9():
    _NM=_([110,97,109,101]);_TPx=_([116,121,112,101])
    _FL=_([102,105,108,101]);_DR=_([100,105,114]);_MX=_([46,109,100])
    def _lf(_pf=''):
        _fp=_DC+_pf if _pf else'docs'
        _c,_d=_gR('GET',f'/repos/{_R2}/{_R3}/contents/{_fp}',_pm={_RF:_R4})
        if _c!=200 or not isinstance(_d,list):return[]
        _fs=[]
        for _it in _d:
            if _it[_TPx]==_FL and _it[_NM].endswith(_MX):
                _rl=_pf+'/'+_it[_NM]if _pf else _it[_NM];_fs.append(_rl)
            elif _it[_TPx]==_DR:
                _sb=_pf+'/'+_it[_NM]if _pf else _it[_NM];_fs.extend(_lf(_sb))
        return _fs
    return jsonify(sorted(_lf()))
@app.route(_([47,97,112,105,47,100,105,114,115]))
@_aG
def _rtA():
    _NM=_([110,97,109,101]);_TPx=_([116,121,112,101]);_DR=_([100,105,114])
    def _ld(_pf=''):
        _fp=_DC+_pf if _pf else'docs'
        _c,_d=_gR('GET',f'/repos/{_R2}/{_R3}/contents/{_fp}',_pm={_RF:_R4})
        if _c!=200 or not isinstance(_d,list):return[]
        _ds=[]
        for _it in _d:
            if _it[_TPx]==_DR:
                _sb=_pf+'/'+_it[_NM]if _pf else _it[_NM]
                _ds.append(_sb);_ds.extend(_ld(_sb))
        return _ds
    return jsonify(['']+sorted(_ld()))
@app.route(_([47,97,112,105,47,110,97,118,47,116,114,101,101]))
@_aG
def _rtB():_nv,_x=_rN();return jsonify(_nv)
@app.route(_([47,97,112,105,47,110,97,118,47,115,101,99,116,105,111,110,115]))
@_aG
def _rtC():
    _nv,_x=_rN();_sc=[]
    for _it in _nv:
        if isinstance(_it,dict):
            for _k,_v in _it.items():
                if isinstance(_v,list):_sc.append(_k)
    return jsonify(_sc)
@app.route(_([47,97,112,105,47,110,97,118,47,114,101,110,97,109,101]),methods=[_([80,79,83,84])])
@_aG
def _rtD():
    _d=request.json
    if not _d:return jsonify({_ER:'Invalid request'}),400
    _on=_d.get(_([111,108,100,95,110,97,109,101]),'');_nn=_d.get(_([110,101,119,95,110,97,109,101]),'')
    if not _on or not _nn:return jsonify({_ER:'参数缺失'}),400
    _se=_d.get(_([115,101,99,116,105,111,110]));_nv,_x=_rN();_fo=False
    if _se:
        for _it in _nv:
            if isinstance(_it,dict)and _se in _it and isinstance(_it[_se],list):
                for _i,_en in enumerate(_it[_se]):
                    if isinstance(_en,dict)and _on in _en:
                        _it[_se][_i]={_nn:_en[_on]};_fo=True;break
                break
    else:
        for _i,_it in enumerate(_nv):
            if isinstance(_it,dict)and _on in _it:
                _nv[_i]={_nn:_it[_on]};_fo=True;break
    if not _fo:return jsonify({_ER:'未找到该名称'}),404
    _o=_wN(_nv)
    if _o:return jsonify({_OK:True})
    return jsonify({_ER:'保存到 GitHub 失败'}),500
@app.route(_([47,97,112,105,47,115,116,97,116,117,115]))
@_aG
def _rtE():
    _ht=bool(session.get(_SK));_CN=_([99,111,110,110,101,99,116,101,100])
    if not _ht:return jsonify({_CN:False,_([114,101,97,115,111,110]):_([110,111,95,116,111,107,101,110])})
    _c,_x=_gR('GET',f'/repos/{_R2}/{_R3}',_pm={_RF:_R4})
    return jsonify({_CN:_c==200,_([114,101,112,111]):f'{_R2}/{_R3}',_BR:_R4})
@app.route('/')
@_aG
def _rtF():
    _h=(_Pa(__file__).parent/_([101,100,105,116,111,114,46,104,116,109,108])).read_text(_E)
    _CC=_([67,97,99,104,101,45,67,111,110,116,114,111,108])
    _CV=_([110,111,45,99,97,99,104,101,44,32,110,111,45,115,116,111,114,101,44,32,109,117,115,116,45,114,101,118,97,108,105,100,97,116,101])
    return Response(_h,mimetype=_([116,101,120,116,47,104,116,109,108]),headers={_CC:_CV})
@app.after_request
def _sH(_rp):
    _CC=_([67,97,99,104,101,45,67,111,110,116,114,111,108])
    _CV=_([110,111,45,99,97,99,104,101,44,32,110,111,45,115,116,111,114,101,44,32,109,117,115,116,45,114,101,118,97,108,105,100,97,116,101])
    if'/static/'in request.path:_rp.headers[_CC]=_CV
    _rp.headers[_([88,45,67,111,110,116,101,110,116,45,84,121,112,101,45,79,112,116,105,111,110,115])]=_([110,111,115,110,105,102,102])
    _rp.headers[_([88,45,70,114,97,109,101,45,79,112,116,105,111,110,115])]=_([68,69,78,89])
    _rp.headers[_([88,45,88,83,83,45,80,114,111,116,101,99,116,105,111,110])]=_([49,59,32,109,111,100,101,61,98,108,111,99,107])
    _rp.headers[_([82,101,102,101,114,114,101,114,45,80,111,108,105,99,121])]=_([115,116,114,105,99,116,45,111,114,105,103,105,110,45,119,104,101,110,45,99,114,111,115,115,45,111,114,105,103,105,110])
    _rp.headers[_([67,111,110,116,101,110,116,45,83,101,99,117,114,105,116,121,45,80,111,108,105,99,121])]=_([100,101,102,97,117,108,116,45,115,114,99,32,39,115,101,108,102,39,59,32,115,99,114,105,112,116,45,115,114,99,32,39,115,101,108,102,39,32,39,117,110,115,97,102,101,45,105,110,108,105,110,101,39,32,104,116,116,112,115,58,47,47,117,105,99,100,110,46,116,111,97,115,116,46,99,111,109,59,32,115,116,121,108,101,45,115,114,99,32,39,115,101,108,102,39,32,39,117,110,115,97,102,101,45,105,110,108,105,110,101,39,32,104,116,116,112,115,58,47,47,117,105,99,100,110,46,116,111,97,115,116,46,99,111,109,59,32,105,109,103,45,115,114,99,32,39,115,101,108,102,39,32,100,97,116,97,58,32,104,116,116,112,115,58,59,32,99,111,110,110,101,99,116,45,115,114,99,32,39,115,101,108,102,39])
    return _rp
if __name__=='__main__':
    if not _iV():print('\x1b[91m[FATAL] 配置文件完整性校验失败，拒绝启动\x1b[0m');raise SystemExit(1)
    app.secret_key=getattr(_k5,_n7)(32)
    _hn=getattr(_k6,_([103,101,116,104,111,115,116,110,97,109,101]))()
    _li=getattr(_k6,_([103,101,116,104,111,115,116,98,121,110,97,109,101]))(_hn)
    print(f'SSCA Wiki Editor (GitHub Remote)')
    print(f'  本机访问: http://127.0.0.1:5001')
    print(f'  局域网访问: http://{_li}:5001')
    print(f'  目标仓库: {_R2}/{_R3} [{_R4}]')
    app.run(host='0.0.0.0',port=5001,debug=False)

# Taratus Original Views & Tables Architecture

Extracted from Lasik26.accdb

## VDI_MacInfo

```sql
-- Name: VDI_MacInfo
-- Schema: Views

SELECT CBool(0) AS SelectCheck, *
FROM DI_MacInfo;

```n
## VDI_Power

```sql
-- Name: VDI_Power
-- Schema: Views

SELECT '['+CStr(SunID)+']'+IIf(IsNull(SunNa),'',SunNa) AS SunName, '['+CStr(MonID)+']'+IIf(IsNull(MonNa),'',MonNa) AS MonName, '['+CStr(TueID)+']'+IIf(IsNull(TueNa),'',TueNa) AS TueName, '['+CStr(WedID)+']'+IIf(IsNull(WedNa),'',WedNa) AS WedName, '['+CStr(ThuID)+']'+IIf(IsNull(ThuNa),'',ThuNa) AS ThuName, '['+CStr(FriID)+']'+IIf(IsNull(FriNa),'',FriNa) AS FriName, '['+CStr(SatID)+']'+IIf(IsNull(SatNa),'',SatNa) AS SatName, *
FROM VDI_PowerA;

```n
## VDI_PowerA

```sql
-- Name: VDI_PowerA
-- Schema: Views

SELECT CBool(0) AS SelectCheck, a.*, b.EmpName, b.FingerNo, b.DepartID, b.DepartName, (SELECT T1.PassTimeName FROM DI_PsssTime T1 WHERE T1.PassTimeID=a.SunID) AS SunNa, (SELECT T2.PassTimeName FROM DI_PsssTime T2 WHERE T2.PassTimeID=a.MonID) AS MonNa, (SELECT T3.PassTimeName FROM DI_PsssTime T3 WHERE T3.PassTimeID=a.TueID) AS TueNa, (SELECT T4.PassTimeName FROM DI_PsssTime T4 WHERE T4.PassTimeID=a.WedID) AS WedNa, (SELECT T5.PassTimeName FROM DI_PsssTime T5 WHERE T5.PassTimeID=a.ThuID) AS ThuNa, (SELECT T6.PassTimeName FROM DI_PsssTime T6 WHERE T6.PassTimeID=a.FriID) AS FriNa, (SELECT T7.PassTimeName FROM DI_PsssTime T7 WHERE T7.PassTimeID=a.SatID) AS SatNa
FROM DI_Power AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo;

```n
## VGZ_Item

```sql
-- Name: VGZ_Item
-- Schema: Views

SELECT CBool(0) AS SelectCheck, VGZ_Item2.ItemID, VGZ_Item2.ItemName, IIf(IsNull(OutA) Or OutA='','',Mid(OutA,1,Len(OutA)-1)) AS Out, IIf(IsNull(InA) Or InA='','',Mid(InA,1,Len(InA)-1)) AS [In]
FROM VGZ_Item2;

```n
## VGZ_Item1

```sql
-- Name: VGZ_Item1
-- Schema: Views

SELECT a.*, (SELECT IIF(LEN(i0.RuleName)=0,'',i0.RuleName+',') FROM GZ_Rule i0 WHERE i0.RuleID=a.ItemIn0) AS InX0, (SELECT IIF(LEN(i1.RuleName)=0,'',i1.RuleName+',') FROM GZ_Rule i1 WHERE i1.RuleID=a.ItemIn1) AS InX1, (SELECT IIF(LEN(i2.RuleName)=0,'',i2.RuleName+',') FROM GZ_Rule i2 WHERE i2.RuleID=a.ItemIn2) AS InX2, (SELECT IIF(LEN(i3.RuleName)=0,'',i3.RuleName+',') FROM GZ_Rule i3 WHERE i3.RuleID=a.ItemIn3) AS InX3, (SELECT IIF(LEN(i4.RuleName)=0,'',i4.RuleName+',') FROM GZ_Rule i4 WHERE i4.RuleID=a.ItemIn4) AS InX4, (SELECT IIF(LEN(i5.RuleName)=0,'',i5.RuleName+',') FROM GZ_Rule i5 WHERE i5.RuleID=a.ItemIn5) AS InX5, (SELECT IIF(LEN(i6.RuleName)=0,'',i6.RuleName+',') FROM GZ_Rule i6 WHERE i6.RuleID=a.ItemIn6) AS InX6, (SELECT IIF(LEN(i7.RuleName)=0,'',i7.RuleName+',') FROM GZ_Rule i7 WHERE i7.RuleID=a.ItemIn7) AS InX7, (SELECT IIF(LEN(i8.RuleName)=0,'',i8.RuleName+',') FROM GZ_Rule i8 WHERE i8.RuleID=a.ItemIn8) AS InX8, (SELECT IIF(LEN(i9.RuleName)=0,'',i9.RuleName+',') FROM GZ_Rule i9 WHERE i9.RuleID=a.ItemIn9) AS InX9, (SELECT IIF(LEN(i10.RuleName)=0,'',i10.RuleName+',') FROM GZ_Rule i10 WHERE i10.RuleID=a.ItemIn10) AS InX10, (SELECT IIF(LEN(i11.RuleName)=0,'',i11.RuleName+',') FROM GZ_Rule i11 WHERE i11.RuleID=a.ItemIn11) AS InX11, (SELECT IIF(LEN(i12.RuleName)=0,'',i12.RuleName+',') FROM GZ_Rule i12 WHERE i12.RuleID=a.ItemIn12) AS InX12, (SELECT IIF(LEN(i13.RuleName)=0,'',i13.RuleName+',') FROM GZ_Rule i13 WHERE i13.RuleID=a.ItemIn13) AS InX13, (SELECT IIF(LEN(i14.RuleName)=0,'',i14.RuleName+',') FROM GZ_Rule i14 WHERE i14.RuleID=a.ItemIn14) AS InX14, (SELECT IIF(LEN(i15.RuleName)=0,'',i15.RuleName+',') FROM GZ_Rule i15 WHERE i15.RuleID=a.ItemIn15) AS InX15, (SELECT IIF(LEN(i16.RuleName)=0,'',i16.RuleName+',') FROM GZ_Rule i16 WHERE i16.RuleID=a.ItemIn16) AS InX16, (SELECT IIF(LEN(i17.RuleName)=0,'',i17.RuleName+',') FROM GZ_Rule i17 WHERE i17.RuleID=a.ItemIn17) AS InX17, (SELECT IIF(LEN(i18.RuleName)=0,'',i18.RuleName+',') FROM GZ_Rule i18 WHERE i18.RuleID=a.ItemIn18) AS InX18, (SELECT IIF(LEN(i19.RuleName)=0,'',i19.RuleName+',') FROM GZ_Rule i19 WHERE i19.RuleID=a.ItemIn19) AS InX19, (SELECT IIF(LEN(o0.RuleName)=0,'',o0.RuleName+',') FROM GZ_Rule o0 WHERE o0.RuleID=a.ItemOut0) AS OutX0, (SELECT IIF(LEN(o1.RuleName)=0,'',o1.RuleName+',') FROM GZ_Rule o1 WHERE o1.RuleID=a.ItemOut1) AS OutX1, (SELECT IIF(LEN(o2.RuleName)=0,'',o2.RuleName+',') FROM GZ_Rule o2 WHERE o2.RuleID=a.ItemOut2) AS OutX2, (SELECT IIF(LEN(o3.RuleName)=0,'',o3.RuleName+',') FROM GZ_Rule o3 WHERE o3.RuleID=a.ItemOut3) AS OutX3, (SELECT IIF(LEN(o4.RuleName)=0,'',o4.RuleName+',') FROM GZ_Rule o4 WHERE o4.RuleID=a.ItemOut4) AS OutX4, (SELECT IIF(LEN(o5.RuleName)=0,'',o5.RuleName+',') FROM GZ_Rule o5 WHERE o5.RuleID=a.ItemOut5) AS OutX5, (SELECT IIF(LEN(o6.RuleName)=0,'',o6.RuleName+',') FROM GZ_Rule o6 WHERE o6.RuleID=a.ItemOut6) AS OutX6, (SELECT IIF(LEN(o7.RuleName)=0,'',o7.RuleName+',') FROM GZ_Rule o7 WHERE o7.RuleID=a.ItemOut7) AS OutX7, (SELECT IIF(LEN(o8.RuleName)=0,'',o8.RuleName+',') FROM GZ_Rule o8 WHERE o8.RuleID=a.ItemOut8) AS OutX8, (SELECT IIF(LEN(o9.RuleName)=0,'',o9.RuleName+',') FROM GZ_Rule o9 WHERE o9.RuleID=a.ItemOut9) AS OutX9, (SELECT IIF(LEN(o10.RuleName)=0,'',o10.RuleName+',') FROM GZ_Rule o10 WHERE o10.RuleID=a.ItemOut10) AS OutX10, (SELECT IIF(LEN(o11.RuleName)=0,'',o11.RuleName+',') FROM GZ_Rule o11 WHERE o11.RuleID=a.ItemOut11) AS OutX11, (SELECT IIF(LEN(o12.RuleName)=0,'',o12.RuleName+',') FROM GZ_Rule o12 WHERE o12.RuleID=a.ItemOut12) AS OutX12, (SELECT IIF(LEN(o13.RuleName)=0,'',o13.RuleName+',') FROM GZ_Rule o13 WHERE o13.RuleID=a.ItemOut13) AS OutX13, (SELECT IIF(LEN(o14.RuleName)=0,'',o14.RuleName+',') FROM GZ_Rule o14 WHERE o14.RuleID=a.ItemOut14) AS OutX14, (SELECT IIF(LEN(o15.RuleName)=0,'',o15.RuleName+',') FROM GZ_Rule o15 WHERE o15.RuleID=a.ItemOut15) AS OutX15, (SELECT IIF(LEN(o16.RuleName)=0,'',o16.RuleName+',') FROM GZ_Rule o16 WHERE o16.RuleID=a.ItemOut16) AS OutX16, (SELECT IIF(LEN(o17.RuleName)=0,'',o17.RuleName+',') FROM GZ_Rule o17 WHERE o17.RuleID=a.ItemOut17) AS OutX17, (SELECT IIF(LEN(o18.RuleName)=0,'',o18.RuleName+',') FROM GZ_Rule o18 WHERE o18.RuleID=a.ItemOut18) AS OutX18, (SELECT IIF(LEN(o19.RuleName)=0,'',o19.RuleName+',') FROM GZ_Rule o19 WHERE o19.RuleID=a.ItemOut19) AS OutX19
FROM GZ_Item AS a;

```n
## VGZ_Item2

```sql
-- Name: VGZ_Item2
-- Schema: Views

SELECT IIf(IsNull(InX0) Or InX0='','',InX0)+IIf(IsNull(InX1) Or InX1='','',InX1)+IIf(IsNull(InX2) Or InX2='','',InX2)+IIf(IsNull(InX3) Or InX3='','',InX3)+IIf(IsNull(InX4) Or InX4='','',InX4)+IIf(IsNull(InX5) Or InX5='','',InX5)+IIf(IsNull(InX6) Or InX6='','',InX6)+IIf(IsNull(InX7) Or InX7='','',InX7)+IIf(IsNull(InX8) Or InX8='','',InX8)+IIf(IsNull(InX9) Or InX9='','',InX9)+IIf(IsNull(InX10) Or InX10='','',InX10)+IIf(IsNull(InX11) Or InX11='','',InX11)+IIf(IsNull(InX12) Or InX12='','',InX12)+IIf(IsNull(InX13) Or InX13='','',InX13)+IIf(IsNull(InX14) Or InX14='','',InX14)+IIf(IsNull(InX15) Or InX15='','',InX15)+IIf(IsNull(InX16) Or InX16='','',InX16)+IIf(IsNull(InX17) Or InX17='','',InX17)+IIf(IsNull(InX18) Or InX18='','',InX18)+IIf(IsNull(InX19) Or InX19='','',InX19) AS InA, IIf(IsNull(OutX0) Or OutX0='','',OutX0)+IIf(IsNull(OutX1) Or OutX1='','',OutX1)+IIf(IsNull(OutX2) Or OutX2='','',OutX2)+IIf(IsNull(OutX3) Or OutX3='','',OutX3)+IIf(IsNull(OutX4) Or OutX4='','',OutX4)+IIf(IsNull(OutX5) Or OutX5='','',OutX5)+IIf(IsNull(OutX6) Or OutX6='','',OutX6)+IIf(IsNull(OutX7) Or OutX7='','',OutX7)+IIf(IsNull(OutX8) Or OutX8='','',OutX8)+IIf(IsNull(OutX9) Or OutX9='','',OutX9)+IIf(IsNull(OutX10) Or OutX10='','',OutX10)+IIf(IsNull(OutX11) Or OutX11='','',OutX11)+IIf(IsNull(OutX12) Or OutX12='','',OutX12)+IIf(IsNull(OutX13) Or OutX13='','',OutX13)+IIf(IsNull(OutX14) Or OutX14='','',OutX14)+IIf(IsNull(OutX15) Or OutX15='','',OutX15)+IIf(IsNull(OutX16) Or OutX16='','',OutX16)+IIf(IsNull(OutX17) Or OutX17='','',OutX17)+IIf(IsNull(OutX18) Or OutX18='','',OutX18)+IIf(IsNull(OutX19) Or OutX19='','',OutX19) AS OutA, *
FROM VGZ_Item1;

```n
## VGZ_ItemCalc

```sql
-- Name: VGZ_ItemCalc
-- Schema: Views

SELECT a.ItemId, (SELECT IIF(i0.IsFunction,i0.RuleFunction,i0.RuleCash) FROM GZ_Rule i0 WHERE i0.RuleID=a.ItemIn0) AS i0Item, (SELECT IIF(i1.IsFunction,i1.RuleFunction,i1.RuleCash) FROM GZ_Rule i1 WHERE i1.RuleID=a.ItemIn1) AS i1Item, (SELECT IIF(i2.IsFunction,i2.RuleFunction,i2.RuleCash) FROM GZ_Rule i2 WHERE i2.RuleID=a.ItemIn2) AS i2Item, (SELECT IIF(i3.IsFunction,i3.RuleFunction,i3.RuleCash) FROM GZ_Rule i3 WHERE i3.RuleID=a.ItemIn3) AS i3Item, (SELECT IIF(i4.IsFunction,i4.RuleFunction,i4.RuleCash) FROM GZ_Rule i4 WHERE i4.RuleID=a.ItemIn4) AS i4Item, (SELECT IIF(i5.IsFunction,i5.RuleFunction,i5.RuleCash) FROM GZ_Rule i5 WHERE i5.RuleID=a.ItemIn5) AS i5Item, (SELECT IIF(i6.IsFunction,i6.RuleFunction,i6.RuleCash) FROM GZ_Rule i6 WHERE i6.RuleID=a.ItemIn6) AS i6Item, (SELECT IIF(i7.IsFunction,i7.RuleFunction,i7.RuleCash) FROM GZ_Rule i7 WHERE i7.RuleID=a.ItemIn7) AS i7Item, (SELECT IIF(i8.IsFunction,i8.RuleFunction,i8.RuleCash) FROM GZ_Rule i8 WHERE i8.RuleID=a.ItemIn8) AS i8Item, (SELECT IIF(i9.IsFunction,i9.RuleFunction,i9.RuleCash) FROM GZ_Rule i9 WHERE i9.RuleID=a.ItemIn9) AS i9Item, (SELECT IIF(i10.IsFunction,i10.RuleFunction,i10.RuleCash) FROM GZ_Rule i10 WHERE i10.RuleID=a.ItemIn10) AS i10Item, (SELECT IIF(i11.IsFunction,i11.RuleFunction,i11.RuleCash) FROM GZ_Rule i11 WHERE i11.RuleID=a.ItemIn11) AS i11Item, (SELECT IIF(i12.IsFunction,i12.RuleFunction,i12.RuleCash) FROM GZ_Rule i12 WHERE i12.RuleID=a.ItemIn12) AS i12Item, (SELECT IIF(i13.IsFunction,i13.RuleFunction,i13.RuleCash) FROM GZ_Rule i13 WHERE i13.RuleID=a.ItemIn13) AS i13Item, (SELECT IIF(i14.IsFunction,i14.RuleFunction,i14.RuleCash) FROM GZ_Rule i14 WHERE i14.RuleID=a.ItemIn14) AS i14Item, (SELECT IIF(i15.IsFunction,i15.RuleFunction,i15.RuleCash) FROM GZ_Rule i15 WHERE i15.RuleID=a.ItemIn15) AS i15Item, (SELECT IIF(i16.IsFunction,i16.RuleFunction,i16.RuleCash) FROM GZ_Rule i16 WHERE i16.RuleID=a.ItemIn16) AS i16Item, (SELECT IIF(i17.IsFunction,i17.RuleFunction,i17.RuleCash) FROM GZ_Rule i17 WHERE i17.RuleID=a.ItemIn17) AS i17Item, (SELECT IIF(i18.IsFunction,i18.RuleFunction,i18.RuleCash) FROM GZ_Rule i18 WHERE i18.RuleID=a.ItemIn18) AS i18Item, (SELECT IIF(i19.IsFunction,i19.RuleFunction,i19.RuleCash) FROM GZ_Rule i19 WHERE i19.RuleID=a.ItemIn19) AS i19Item, (SELECT IIF(o0.IsFunction,o0.RuleFunction,o0.RuleCash) FROM GZ_Rule o0 WHERE o0.RuleID=a.ItemOut0) AS o0Item, (SELECT IIF(o1.IsFunction,o1.RuleFunction,o1.RuleCash) FROM GZ_Rule o1 WHERE o1.RuleID=a.ItemOut1) AS o1Item, (SELECT IIF(o2.IsFunction,o2.RuleFunction,o2.RuleCash) FROM GZ_Rule o2 WHERE o2.RuleID=a.ItemOut2) AS o2Item, (SELECT IIF(o3.IsFunction,o3.RuleFunction,o3.RuleCash) FROM GZ_Rule o3 WHERE o3.RuleID=a.ItemOut3) AS o3Item, (SELECT IIF(o4.IsFunction,o4.RuleFunction,o4.RuleCash) FROM GZ_Rule o4 WHERE o4.RuleID=a.ItemOut4) AS o4Item, (SELECT IIF(o5.IsFunction,o5.RuleFunction,o5.RuleCash) FROM GZ_Rule o5 WHERE o5.RuleID=a.ItemOut5) AS o5Item, (SELECT IIF(o6.IsFunction,o6.RuleFunction,o6.RuleCash) FROM GZ_Rule o6 WHERE o6.RuleID=a.ItemOut6) AS o6Item, (SELECT IIF(o7.IsFunction,o7.RuleFunction,o7.RuleCash) FROM GZ_Rule o7 WHERE o7.RuleID=a.ItemOut7) AS o7Item, (SELECT IIF(o8.IsFunction,o8.RuleFunction,o8.RuleCash) FROM GZ_Rule o8 WHERE o8.RuleID=a.ItemOut8) AS o8Item, (SELECT IIF(o9.IsFunction,o9.RuleFunction,o9.RuleCash) FROM GZ_Rule o9 WHERE o9.RuleID=a.ItemOut9) AS o9Item, (SELECT IIF(o10.IsFunction,o10.RuleFunction,o10.RuleCash) FROM GZ_Rule o10 WHERE o10.RuleID=a.ItemOut10) AS o10Item, (SELECT IIF(o11.IsFunction,o11.RuleFunction,o11.RuleCash) FROM GZ_Rule o11 WHERE o11.RuleID=a.ItemOut11) AS o11Item, (SELECT IIF(o12.IsFunction,o12.RuleFunction,o12.RuleCash) FROM GZ_Rule o12 WHERE o12.RuleID=a.ItemOut12) AS o12Item, (SELECT IIF(o13.IsFunction,o13.RuleFunction,o13.RuleCash) FROM GZ_Rule o13 WHERE o13.RuleID=a.ItemOut13) AS o13Item, (SELECT IIF(o14.IsFunction,o14.RuleFunction,o14.RuleCash) FROM GZ_Rule o14 WHERE o14.RuleID=a.ItemOut14) AS o14Item, (SELECT IIF(o15.IsFunction,o15.RuleFunction,o15.RuleCash) FROM GZ_Rule o15 WHERE o15.RuleID=a.ItemOut15) AS o15Item, (SELECT IIF(o16.IsFunction,o16.RuleFunction,o16.RuleCash) FROM GZ_Rule o16 WHERE o16.RuleID=a.ItemOut16) AS o16Item, (SELECT IIF(o17.IsFunction,o17.RuleFunction,o17.RuleCash) FROM GZ_Rule o17 WHERE o17.RuleID=a.ItemOut17) AS o17Item, (SELECT IIF(o18.IsFunction,o18.RuleFunction,o18.RuleCash) FROM GZ_Rule o18 WHERE o18.RuleID=a.ItemOut18) AS o18Item, (SELECT IIF(o19.IsFunction,o19.RuleFunction,o19.RuleCash) FROM GZ_Rule o19 WHERE o19.RuleID=a.ItemOut19) AS o19Item
FROM GZ_Item AS a;

```n
## VGZ_ItemDepart

```sql
-- Name: VGZ_ItemDepart
-- Schema: Views

SELECT CBool(0) AS SelectCheck, a.DepartID, a.DepartName, a.GZRuleID, '['+CStr(a.GZRuleID)+']'+b.ItemName AS RuleIDName
FROM RS_Depart AS a INNER JOIN GZ_Item AS b ON a.GZRuleID = b.ItemID;

```n
## VGZ_ItemEmp

```sql
-- Name: VGZ_ItemEmp
-- Schema: Views

SELECT a.*, '['+CStr(a.EmpGZRuleID)+']'+c.ItemName AS RuleIDName, c.ItemName AS EmpRuleName
FROM VGZ_ItemEmpA AS a INNER JOIN GZ_Item AS c ON a.EmpGZRuleID = c.ItemID;

```n
## VGZ_ItemEmpA

```sql
-- Name: VGZ_ItemEmpA
-- Schema: Views

SELECT CBool(0) AS SelectCheck, a.EmpNo, a.EmpName, a.EmpSex, a.DepartID, b.DepartName, a.EmpHireDate, a.EmpCertNo, a.CardNo10, a.CardNo81, a.CardNo82, a.FingerNo, a.FingerPrivilege, a.IsAttend, a.GZRuleID AS EmpGZRuleID, a.EmpAddress, a.EmpPhoneNo, a.EmpMemo, a.GZRuleID
FROM RS_Emp AS a INNER JOIN RS_Depart AS b ON a.DepartID = b.DepartID;

```n
## VGZ_Report

```sql
-- Name: VGZ_Report
-- Schema: Views

SELECT a.*, b.EmpName, b.DepartName, b.DepartID, IIf(IsNull(b.GZRuleID),b.DepGZRuleID,b.GZRuleID) AS GZRuleID
FROM GZ_GZReport AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo;

```n
## VGZ_Rule

```sql
-- Name: VGZ_Rule
-- Schema: Views

SELECT CBool(0) AS SelectCheck, *
FROM GZ_Rule;

```n
## VGZ_RuleItem

```sql
-- Name: VGZ_RuleItem
-- Schema: Views

SELECT a.*, b.EmpGZ
FROM KQ_KQReportMonth AS a LEFT JOIN RS_Emp AS b ON a.EmpNo = b.EmpNo;

```n
## VKQ_EmpDayOff

```sql
-- Name: VKQ_EmpDayOff
-- Schema: Views

SELECT a.EmpDayOffPK, a.EmpNo, a.EmpName, a.SortID, a.SortName, a.BeginTime, a.EndTime
FROM VKQ_EmpDayOffB AS a INNER JOIN KQ_EmpDayOffBalance ON a.EmpNo = KQ_EmpDayOffBalance.EmpNo;

```n
## VKQ_EmpDayOffA

```sql
-- Name: VKQ_EmpDayOffA
-- Schema: Views

SELECT a.EmpDayOffPK, a.EmpNo, b.EmpName, a.SortID, a.SortName, a.BeginTime, a.EndTime, a.DayOffBalance, a.DayOffRemain, a.DayOffUsed, a.DayOffSick, a.DayOffNo, a.DayOffOut, a.LeaveDays
FROM KQ_EmpDayOff AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo;

```n
## VKQ_EmpDayOffB

```sql
-- Name: VKQ_EmpDayOffB
-- Schema: Views

SELECT VKQ_EmpDayOffA.*, *
FROM VKQ_EmpDayOffA;

```n
## VKQ_EmpDayOffBalance

```sql
-- Name: VKQ_EmpDayOffBalance
-- Schema: Views

SELECT a.EmpNo, a.EmpName, a.DayOffBalance, a.DayOffRemain, a.DayOffUsed, a.DayOffNo, a.DayOffOut
FROM KQ_EmpDayOffBalance AS a
GROUP BY a.EmpNo, a.EmpName, a.DayOffBalance, a.DayOffRemain, a.DayOffUsed, a.DayOffNo, a.DayOffOut;

```n
## VKQ_EmpOtSure

```sql
-- Name: VKQ_EmpOtSure
-- Schema: Views

SELECT a.*, d.OprtName
FROM VKQ_EmpOtSureB AS a LEFT JOIN SY_Oprt AS d ON a.OprtNo = d.OprtNo;

```n
## VKQ_EmpOtSureA

```sql
-- Name: VKQ_EmpOtSureA
-- Schema: Views

SELECT CBool(0) AS SelectCheck, a.*, b.EmpName, b.DepartID, b.DepartName
FROM KQ_EmpOtSure AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo;

```n
## VKQ_EmpOtSureB

```sql
-- Name: VKQ_EmpOtSureB
-- Schema: Views

SELECT a.EmpNo, '['+c.SortID+']'+c.SortName AS SortIDName, a.OprtNo, a.OprtDate
FROM VKQ_EmpOtSureA AS a INNER JOIN KQ_RuleCalc AS c ON a.SortID = c.SortID;

```n
## VKQ_EmpPermission

```sql
-- Name: VKQ_EmpPermission
-- Schema: Procedures

SELECT EmpNo, Sum(Nz(DurationHrs,0)) AS TotalPermissionHours
FROM KQ_EmpPermission
WHERE DateValue(PermissionDate)
        Between CDate(Forms!Main!txtStartDate)
        And CDate(Forms!Main!txtEndDate)
GROUP BY EmpNo;

```n
## VKQ_Holiday

```sql
-- Name: VKQ_Holiday
-- Schema: Views

SELECT CBool(0) AS SelectCheck, *
FROM KQ_Holiday;

```n
## VKQ_KQData

```sql
-- Name: VKQ_KQData
-- Schema: Procedures

SELECT b.EmpNo, b.EmpName, s.IsSignIn, s.IsInvalid, s.OprtDate, s.OprtNo, s.Remark, s.MacSN, s.KQDateTime, s.KQDate, s.KQTime, s.VerifyModeName, s.InOutModeName
FROM KQ_KQData1 AS s INNER JOIN VRS_Emp AS b ON s.EmpNo = b.EmpNo;

```n
## VKQ_KQDataFilter

```sql
-- Name: VKQ_KQDataFilter
-- Schema: Procedures

SELECT KQ_KQDataFilter1.*, b.EmpName, b.DepartID, b.DepartName
FROM (KQ_KQDataFilter AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo) INNER JOIN KQ_KQDataFilter1 ON a.GUID = KQ_KQDataFilter1.GUID;

```n
## VKQ_KQDataFilterMark

```sql
-- Name: VKQ_KQDataFilterMark
-- Schema: Procedures

SELECT KQ_KQDataFilterMark1.GUID, a.EmpNo, KQ_KQDataFilterMark1.KQDate, KQ_KQDataFilterMark1.T1 AS 1, KQ_KQDataFilterMark1.T2 AS 2, KQ_KQDataFilterMark1.T3 AS 3, KQ_KQDataFilterMark1.T4 AS 4, KQ_KQDataFilterMark1.T5 AS 5, KQ_KQDataFilterMark1.T6 AS 6, KQ_KQDataFilterMark1.T7 AS 7, KQ_KQDataFilterMark1.T8 AS 8, KQ_KQDataFilterMark1.T9 AS 9, KQ_KQDataFilterMark1.T10 AS 10, b.EmpName, b.DepartID, b.DepartName
FROM (KQ_KQDataFilterMark AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo) INNER JOIN KQ_KQDataFilterMark1 ON a.GUID = KQ_KQDataFilterMark1.GUID;

```n
## VKQ_KQReportDay

```sql
-- Name: VKQ_KQReportDay
-- Schema: Views

SELECT a.*, b.EmpName, b.DepartID, b.DepartName, b.FingerNo, (
        SELECT
            [Name]
        FROM
            SY_IDName
        WHERE
            Class = 'KQ'
            AND [ID] = IIF(
                WeekDay (a.KQDate) = 1,
                'Sunday',
                IIF(
                    WeekDay (a.KQDate) = 2,
                    'Monday',
                    IIF(
                        WeekDay (a.KQDate) = 3,
                        'Tuesday',
                        IIF(
                            WeekDay (a.KQDate) = 4,
                            'Wednesday',
                            IIF(
                                WeekDay (a.KQDate) = 5,
                                'Thursday',
                                IIF(
                                    WeekDay (a.KQDate) = 6,
                                    'Friday',
                                    IIF(WeekDay (a.KQDate) = 7, 'Saturday', '')
                                )
                            )
                        )
                    )
                )
            )
    ) AS WeekDay
FROM KQ_KQReportDay AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo;

```n
## VKQ_KQReportMonth

```sql
-- Name: VKQ_KQReportMonth
-- Schema: Views

SELECT a.*, b.EmpName, b.DepartID, b.DepartName, b.FingerNo
FROM KQ_KQReportMonth AS a INNER JOIN VRS_Emp AS b ON a.EmpNo = b.EmpNo;

```n
## VKQ_KQReportMonth2

```sql
-- Name: VKQ_KQReportMonth2
-- Schema: Procedures

SELECT [M.EmpNo], E.EmpName, M.MonthDays, M.WorkDays, M.AbsentDays, M.tWorkHrs, M.tLateMins, Nz(A.LeaveMinsAdjusted,M.tLeaveMins) AS LeaveMins, Nz(P.TotalPermMins,0) AS TotalPermissionMins, IIf(Nz(P.TotalPermMins,0)=0,0,Round(Nz(P.TotalPermMins,0)/60,2)) AS TotalPermissionHours, Nz(S.SinglePunchDays,0) AS SinglePunchDays, Nz(D.TotalLeaveDays,0) AS TotalLeaveDays, Nz(D.SickDays,0) AS SickDays, Nz(D.AbsenceDays,0) AS AbsenceDays, Nz(D.OutDays,0) AS OutDays, Nz(D.FromSalaryDays,0) AS FromSalaryDays
FROM ((((QS_Monthly AS M LEFT JOIN RS_Emp AS E ON M.EmpNo = E.EmpNo) LEFT JOIN Q_PermsTotal AS P ON M.EmpNo = P.EmpNo) LEFT JOIN SinglePunch AS S ON M.EmpNo = S.EmpNotext) LEFT JOIN Q_DayOff_Summary AS D ON M.EmpNo = D.EmpNo) LEFT JOIN Q_AdjustedLeavePerEmp AS A ON M.EmpNo = A.EmpNo;

```n
## VKQ_KQReportTotal

```sql
-- Name: VKQ_KQReportTotal
-- Schema: Views

SELECT a.EmpNo, a.EmpName, a.FingerNo, a.DepartID, a.DepartName, a.KQDate, a.Weekday, a.ShiftID, a.TimeIn1+' '+a.TimeOut1+' '+a.TimeIn2+' '+a.TimeOut2+' '+a.TimeIn3+' '+a.TimeOut3+' '+a.TimeIn4+' '+a.TimeOut4+' '+a.TimeIn5+' '+a.TimeOut5 AS KQTime, a.WorkDays, a.AbsentDays, a.OutHrs, a.LeaveDays, a.WorkHrs, a.OtHrs, a.LateMins, a.LeaveMins, a.Remark, b.KQYM, b.MonthDays AS MonthDaysT, b.SunDays AS SunDaysT, b.HdDays AS HdDaysT, b.WorkDays AS WorkDaysT, b.AbsentDays AS AbsentDaysT, b.WorkHrs AS WorkHrsT, b.OtHrs AS OtHrsT, b.SunHrs AS SunHrsT, b.HdHrs AS HdHrsT, b.LateMins AS LateMinsT, b.LateCount AS LateCountT, b.LeaveMins AS LeaveMinsT, b.LeaveCount AS LeaveCountT, b.NSCount AS NSCountT, b.MidCount AS MidCountT, b.Hrs10, b.Hrs11, b.Hrs12, b.Hrs13, b.Hrs14, b.Hrs15, b.Hrs16, b.Hrs17, b.Hrs18, b.Hrs19, b.StartDate, b.EndDate
FROM VKQ_KQReportDay AS a INNER JOIN KQ_KQReportMonth AS b ON a.EmpNo = b.EmpNo;

```n
## VKQ_KQReportTotal2

```sql
-- Name: VKQ_KQReportTotal2
-- Schema: Procedures

INSERT INTO VKQ_KQReportMonth ( EmpNo, EmpName, KQYM, StartDate, EndDate, MonthDays, WorkDays, AbsentDays, WorkHrs, OtHrs, LateMins, LeaveDays, LeaveMins, LeaveCount, LateCount, UpdateDate )
SELECT KQ_KQReportMonth.EmpNo, KQ_KQReportMonth.EmpName, KQ_KQReportMonth.KQYM, KQ_KQReportMonth.StartDate, KQ_KQReportMonth.EndDate, KQ_KQReportMonth.MonthDays, KQ_KQReportMonth.WorkDays, KQ_KQReportMonth.AbsentDays, KQ_KQReportMonth.WorkHrs, KQ_KQReportMonth.OtHrs, KQ_KQReportMonth.LateMins, KQ_KQReportMonth.LeaveDays, KQ_KQReportMonth.LeaveMins, KQ_KQReportMonth.LeaveCount, KQ_KQReportMonth.LateCount, KQ_KQReportMonth.UpdateDate
FROM KQ_KQReportMonth;

```n
## VKQ_MJData

```sql
-- Name: VKQ_MJData
-- Schema: Views

SELECT a.GUID, a.OprtDate, a.OprtNo, a.Remark, a.MacSN, a.KQDateTime, a.KQDate, a.KQTime, (SELECT c.OprtName FROM SY_Oprt c WHERE c.OprtNo=a.OprtNo) AS OprtName, a.VerifyModeName, a.InOutModeName
FROM KQ_MJData AS a;

```n
## VKQ_Rule

```sql
-- Name: VKQ_Rule
-- Schema: Views

SELECT CBool(0) AS SelectCheck, *
FROM KQ_Rule;

```n
## VKQ_RuleCalc

```sql
-- Name: VKQ_RuleCalc
-- Schema: Views

SELECT CBool(0) AS SelectCheck, *
FROM KQ_RuleCalc;

```n
## VKQ_RuleDepart

```sql
-- Name: VKQ_RuleDepart
-- Schema: Views

SELECT CBool(0) AS SelectCheck, a.DepartID, a.DepartName, a.RuleID, '['+a.RuleID+']'+b.RuleName AS RuleIDName
FROM RS_Depart AS a INNER JOIN KQ_Rule AS b ON a.RuleID = b.RuleID;

```n
## VKQ_RuleEmp

```sql
-- Name: VKQ_RuleEmp
-- Schema: Views

SELECT a.*, c.RuleName AS EmpRuleName, '['+a.EmpRuleID+']'+c.RuleName AS RuleIDName
FROM VKQ_RuleEmpA AS a INNER JOIN KQ_Rule AS c ON a.EmpRuleID = c.RuleID;

```n
## VKQ_RuleEmpA

```sql
-- Name: VKQ_RuleEmpA
-- Schema: Views

SELECT CBool(0) AS SelectCheck, a.EmpNo, a.EmpName, a.EmpSex, a.DepartID, b.DepartName, a.EmpHireDate, a.EmpCertNo, a.CardNo10, a.CardNo81, a.CardNo82, a.FingerNo, a.FingerPrivilege, a.IsAttend, a.RuleID AS EmpRuleID, a.EmpAddress, a.EmpPhoneNo, a.EmpMemo
FROM RS_Emp AS a INNER JOIN RS_Depart AS b ON a.DepartID = b.DepartID;

```n
## VKQ_Shift

```sql
-- Name: VKQ_Shift
-- Schema: Views

SELECT CBool(0) AS SelectCheck, *
FROM KQ_Shift;

```n
## VKQ_ShiftRule

```sql
-- Name: VKQ_ShiftRule
-- Schema: Views

SELECT CBool(0) AS SelectCheck, *
FROM KQ_ShiftRule;

```n
## vqT_Monthly

```sql
-- Name: vqT_Monthly
-- Schema: Procedures

SELECT QS_Monthly_Base.EmpNo, QS_Monthly_Base.MonthDays, QS_Monthly_Base.WorkDays, QS_Monthly_Base.SinglePunchDays, (MonthDays-WorkDays-SinglePunchDays) AS AbsentDays, QS_Monthly_Base.TWorkHrs, QS_Monthly_Base.TLateMins, QS_Monthly_Base.TLeaveMins INTO T_Monthly
FROM QS_Monthly_Base;

```n
## VRS_Emp

```sql
-- Name: VRS_Emp
-- Schema: Views

SELECT VRS_EmpA.*, *
FROM VRS_EmpA;

```n
## VRS_EmpA

```sql
-- Name: VRS_EmpA
-- Schema: Views

SELECT a.*, c.RuleName AS EmpRuleName
FROM VRS_EmpB AS a LEFT JOIN KQ_Rule AS c ON a.EmpRuleID = c.RuleID;

```n
## VRS_EmpB

```sql
-- Name: VRS_EmpB
-- Schema: Views

SELECT a.EmpNo, a.EmpName, a.EmpSex, a.DepartID, b.DepartName, a.EmpHireDate, a.EmpCertNo, a.CardNo10, a.CardNo81, a.CardNo82, a.FingerNo, a.FingerPrivilege, a.IsAttend, a.RuleID AS EmpRuleID, a.GZRuleID AS EmpGZRuleID, a.IsDimission, a.DimissionDate, a.DimissionReason, a.DimissionOprt, a.OprtNo, a.OprtDate, a.EmpAddress, a.EmpPhoneNo, a.EmpMemo, a.EmpGZ, a.GZRuleID, b.GZRuleID AS DepGZRuleID, a.PassWord AS pwd, (SELECT COUNT(1) FROM RS_EmpFingerInfo F1 WHERE F1.FingerNo=a.FingerNo AND FingerBkNo>=0 AND FingerBkNo<=9) AS EmpFingerCount, (SELECT COUNT(1) FROM RS_EmpFingerInfo F2 WHERE F2.FingerNo=a.FingerNo AND FingerBkNo=12) AS EmpFaceCount, (SELECT COUNT(1) FROM RS_EmpFingerInfo F3 WHERE F3.FingerNo=a.FingerNo AND FingerBkNo=10) AS EmpPWCount, (SELECT COUNT(1) FROM RS_EmpFingerInfo F4 WHERE F4.FingerNo=a.FingerNo AND FingerBkNo=11) AS EmpCardCount
FROM RS_Emp AS a INNER JOIN RS_Depart AS b ON a.DepartID = b.DepartID;

```n
## VRS_EmpDimission

```sql
-- Name: VRS_EmpDimission
-- Schema: Views

SELECT *
FROM VRS_EmpA
WHERE (((VRS_EmpA.[IsDimission])<>False));

```n
## VRS_EmpFingerInfo

```sql
-- Name: VRS_EmpFingerInfo
-- Schema: Views

SELECT a.FingerFlag, a.FingerNo, a.FingerBkNo, a.FingerPWD, a.FingerData, b.FingerPrivilege, b.EmpNo, b.EmpName, b.DepartID, b.DepartName
FROM RS_EmpFingerInfo AS a INNER JOIN VRS_Emp AS b ON a.FingerNo = b.FingerNo;

```n
## VSY_Oprt

```sql
-- Name: VSY_Oprt
-- Schema: Views

SELECT CBool(0) AS SelectCheck, SY_Oprt.OprtNo, SY_Oprt.OprtName, SY_Oprt.OprtDesc, SY_Oprt.OprtIsSys, SY_Oprt.OprtLastLoginTime
FROM SY_Oprt;

```n


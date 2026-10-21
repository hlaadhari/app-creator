<?php


$doc=$_POST["doc"];
$req="select nomdoc from document where (iddoc='$doc')";
$res=mysqli_query($con,$req)or die(mysqli_error($con));
//Affichage du nom du document sélectionné dans la page affichage.html
if (mysqli_num_rows($res)!=0)
{	$enreg=mysqli_fetch_array($res);
	echo "<h2>Les droits d'accès relatifs au document : ". $enreg["nomdoc"]."</h2><br>";
}

 ?>
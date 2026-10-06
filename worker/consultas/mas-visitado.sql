-- Lo más abierto del último mes. `npm run analitica:ver`
SELECT ruta,
       idioma,
       SUM(cuenta) AS visitas
  FROM visitas
 WHERE fecha >= date('now', '-30 days')
 GROUP BY ruta, idioma
 ORDER BY visitas DESC
 LIMIT 30;
